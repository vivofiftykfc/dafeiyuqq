"""Role-scoped, source-bound records of actual public-content tool reads."""
import hashlib,json,sqlite3,time,sys,ipaddress,uuid,re
from pathlib import Path
from datetime import datetime,timezone,timedelta
from urllib.parse import urlsplit,urlunsplit,parse_qsl,urlencode
from privacy_policy import ROOT
TZ=timezone(timedelta(hours=8))

def safe_url(value):
    if not isinstance(value,str) or len(value)>2048:raise ValueError('Invalid reading URL')
    parsed=urlsplit(value)
    if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password or parsed.port not in (None,443):raise ValueError('Public HTTPS reading URL required')
    if '.' not in parsed.hostname or parsed.hostname.endswith(('.local','.localhost','.internal')):raise ValueError('Public reading hostname required')
    try:ipaddress.ip_address(parsed.hostname)
    except ValueError:pass
    else:raise ValueError('Literal network address is not a public reading source')
    query=urlencode([(key,val) for key,val in parse_qsl(parsed.query) if key.lower() in ('id','article_id','post_id','bvid','aid','p','page')])
    return urlunsplit((parsed.scheme,parsed.netloc,parsed.path,query,''))

class Journal:
    def __init__(self,path=None):
        self.db=sqlite3.connect(path or ROOT/'runtime/reading-journal.sqlite',timeout=10)
        self.db.row_factory=sqlite3.Row
        self.db.executescript('CREATE TABLE IF NOT EXISTS readings(id TEXT PRIMARY KEY,scope TEXT,avatar TEXT,source TEXT,kind TEXT,url TEXT,title TEXT,excerpt TEXT,evidence_sha256 TEXT,coverage TEXT,stamp REAL);CREATE INDEX IF NOT EXISTS reading_actor ON readings(scope,avatar,stamp DESC);')
        self.db.commit()
    def record(self,job,kind,evidence):
        if job.get('evaluation'):return {'stored':False,'reason':'evaluation_excluded'}
        source=job.get('id','');source_kind=job.get('kind','')
        if not ((source.startswith('wechat:') and source_kind=='chat') or (source.startswith('runtime:') and source_kind.startswith('runtime:'))):raise ValueError('Unknown activity source')
        if job.get('scope') not in ('private','group') or not job.get('avatar'):raise ValueError('Unknown reading actor')
        if kind=='webpage':
            text=evidence.get('text','');coverage={'reading_status':'page_text','truncated':bool(evidence.get('text_truncated')),'limitations':'实际返回的网页文本，可能不含动态内容；不是整站或整本书'}
        elif kind in ('video','picture_note'):
            text=evidence.get('content_evidence','');coverage={key:evidence.get(key) for key in ('reading_status','limitations','coverage')};coverage['watched_entire_video']=False
        else:raise ValueError('Unknown reading kind')
        if not isinstance(text,str) or not text.strip():return {'stored':False,'reason':'no_content_evidence'}
        url=safe_url(evidence['url']);digest=hashlib.sha256(text.encode()).hexdigest();identity=hashlib.sha256(json.dumps([job['scope'],job['avatar'],source,kind,url,digest]).encode()).hexdigest()[:24]
        title=evidence.get('title','')
        if not isinstance(title,str):title=''
        with self.db:
            changed=self.db.execute('INSERT OR IGNORE INTO readings VALUES(?,?,?,?,?,?,?,?,?,?,?)',(identity,job['scope'],job['avatar'],source,kind,url,title[:240],' '.join(text.split())[:1800],digest,json.dumps(coverage,ensure_ascii=False),time.time())).rowcount
        return {'stored':bool(changed),'id':identity,'already_recorded':not bool(changed)}
    def recent(self,scope,avatar,query='',limit=6,days=14):
        if scope not in ('private','group') or not isinstance(query,str) or len(query)>100 or type(limit) is not int or not 1<=limit<=12 or type(days) is not int or not 1<=days<=180:raise ValueError('Invalid reading query')
        rows=self.db.execute('SELECT * FROM readings WHERE scope=? AND avatar=? AND stamp>=? ORDER BY stamp DESC LIMIT 1000',(scope,avatar,time.time()-days*86400)).fetchall()
        output=[];seen=set();terms=query.casefold().split()
        for row in rows:
            if row['url'] in seen:continue
            if terms and not any(term in (row['title']+' '+row['excerpt']).casefold() for term in terms):continue
            seen.add(row['url']);output.append({'id':row['id'],'kind':row['kind'],'url':row['url'],'title':row['title'],'excerpt':row['excerpt'][:1200],'coverage':json.loads(row['coverage']),'recorded_at':datetime.fromtimestamp(row['stamp'],TZ).isoformat(timespec='seconds'),'source':row['source']})
            if len(output)>=limit:break
        return {'items':output,'scope':scope,'avatar':avatar,'time_semantics':'recorded_at is when returned content was available to this role, not the publication date','limitations':'Records prove a bounded content read, not complete viewing, real-world experience, a prior opinion, or a message sent to the owner'}

def record_feed_reads(root,actor,scope,items):
    journal=Journal(Path(root)/'runtime/reading-journal.sqlite')
    try:
        source='runtime:feed-read:'+uuid.uuid4().hex
        for item in items:
            if item['id'].startswith('bili:'):journal.record({'id':source,'kind':'runtime:feed-read','scope':scope,'avatar':actor['avatar']},'video',item)
    finally:journal.db.close()

def context_for_turn(job,jobs,config,path=None):
    """Retrieve relevant autobiographical evidence before drafting, not after denial."""
    text=job.get('text','')
    if job.get('kind')!='chat' or not re.search(r'(?:你.{0,12}(?:最近|今天|刚才|这两天).{0,12}(?:看|读|刷|有意思|有趣|新鲜)|(?:最近|今天).{0,8}你.{0,8}(?:看|读|刷)|你.{0,5}(?:看|读|刷).{0,5}(?:什么|啥)|有什么新鲜事)',text):return None
    journal=Journal(path)
    try:return dispatch({'operation':'recent','job_id':job['id'],'limit':3,'days':14},jobs,config,journal)
    finally:journal.db.close()

def dispatch(request,jobs,config,journal):
    from public_read_policy import admitted
    job=jobs[request['job_id']]
    if not admitted(job,config) or job.get('dshDeadline',float('inf'))<=time.time()*1000:raise ValueError('Inactive reading source')
    if request['operation']=='record':return journal.record(job,request['kind'],request['evidence'])
    if request['operation']=='recent':
        result=journal.recent(job['scope'],job['avatar'],request.get('query',''),request.get('limit',6),request.get('days',14))
        for item in result['items']:
            source=jobs.get(item['source'],{})
            if source.get('evaluation') or source.get('scope')!=job['scope'] or source.get('avatar')!=job['avatar'] or source.get('state')!='done' or not source.get('kind','').startswith('runtime:reading-session'):continue
            try:
                raw=source.get('result','').strip()
                if raw.startswith('```'):raw=raw.split('\n',1)[1].rsplit('```',1)[0].strip()
                note=json.loads(raw)
                if isinstance(note,dict) and safe_url(note.get('url',''))==item['url'] and isinstance(note.get('thought'),str) and 0<len(note['thought'])<=1200:item['reflection']={'text':note['thought'],'source':source['id'],'delivery_verified':False,'kind':'recorded_model_reading_note'}
            except (ValueError,TypeError):pass
        return result
    raise ValueError('Unknown reading operation')

if __name__=='__main__':
    request=json.loads(sys.argv[1]);jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'));config=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'));journal=Journal()
    try:print(json.dumps(dispatch(request,jobs,config,journal),ensure_ascii=False))
    finally:journal.db.close()
