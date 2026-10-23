"""Current-owner feedback -> bounded, versioned style -> live Tavern card.

Only speaking preferences evolve; identity, factual memory and capabilities are
not rewritten. The same section is projected into generation even if a browser
card cache has not refreshed yet.
"""
import hashlib,json,re,sqlite3,sys,time
from pathlib import Path
import httpx
from privacy_policy import ROOT

START='【用户反馈形成的聊天风格】'
END='【聊天风格更新结束】'
RULES={
 'tone':{'casual':'自然口语，少用正式报告、客服客套和刻意端着的表达。','warm':'温柔亲近但不过度甜腻，具体回应眼前的话。','direct':'直接说自己的意思与判断，不铺垫客套。','natural':'按语境自然调整语气，不固定扮演某种腔调。'},
 'length':{'concise':'日常回复收短，意思说完就停；认真任务仍要答完整。','detailed':'认真问题充分展开，解释理由和细节；日常闲聊不用凑长。','adaptive':'篇幅随内容变化，不固定字数，不为了短句省掉关键意思。'},
 'questions':{'fewer':'不习惯性用追问或反问收尾；确实缺信息时再问。','natural':'有真实好奇再问，不把聊天变成连续采访。'},
 'advice':{'on_request':'闲聊先参与，不擅自分析用户心理或给行动建议；明确求助时再认真分析。','natural':'按当下需求选择闲聊、讨论或建议，不每句话都讲道理。'},
 'affection':{'less':'少用固定昵称、撒娇和重复亲昵套话，亲近通过具体回应体现。','natural':'亲昵与玩笑顺着语境发生，不固定频率或台词。'},
 'stance':{'independent':'可以表达不同意见、自己的审美与理由，不为附和而改口。','natural':'诚实回应，不强行反对，也不一味赞同。'},
}

def feedback_text(text):
    return bool(isinstance(text,str) and 2<=len(text)<=2000 and not re.search(r'他说|她说|原文|引用|转发|提示词|举例|截图里|这段代码|这次|本次|这道|这题|这篇|这一段',text) and re.search(r'别|不要|不用|少|多|一点|太|以后|希望|改|喜欢|自然|像人',text) and re.search(r'聊天|回复|回答|说话|语气|客服|官方|正式|端着|追问|问问题|说教|分析我|撒娇|称呼|昵称|字数|附和|像人',text))

def detect(text):
    if not feedback_text(text):return {}
    result={}
    if re.search(r'(?:别|不要|不用|少|太).{0,8}(?:客服|官方|正式|端着)|(?:聊天|说话|语气).{0,6}(?:自然|随意|像人)',text):result['tone']='casual'
    if re.search(r'(?:别|不要|不用|少).{0,8}(?:分析我|说教|给我建议)',text):result['advice']='on_request'
    if re.search(r'(?:别|不要|不用|少).{0,8}(?:追问|问问题|反问)',text):result['questions']='fewer'
    if re.search(r'(?:回答|回复|说话).{0,8}(?:短一点|简短|太长)|(?:简短|短一点).{0,5}(?:回答|回复)',text):result['length']='concise'
    if re.search(r'(?:回答|回复|解释).{0,8}(?:详细|展开|长一点)',text):result['length']='detailed'
    if re.search(r'该长就长|(?:不用|不要|别).{0,8}(?:限制字数|固定字数|刻意简短|刻意缩短)',text):result['length']='adaptive'
    if re.search(r'(?:别|不要|少).{0,8}(?:撒娇|昵称|亲爱的|宝贝)',text):result['affection']='less'
    if re.search(r'(?:别|不要|不用).{0,8}附和|有自己的(?:观点|看法|主见)',text):result['stance']='independent'
    return result

def eligible(job,cfg):
    from dsh_policy import admitted
    return bool(admitted(job,cfg) and not job.get('evaluation') and job.get('scope')=='private' and job.get('kind')=='chat' and job.get('id','').startswith('wechat:'))

class Styles:
    def __init__(self,root=ROOT):
        self.root=root;self.db=sqlite3.connect(root/'runtime/style-evolution.sqlite',timeout=10)
        self.db.executescript('CREATE TABLE IF NOT EXISTS styles(scope TEXT PRIMARY KEY,settings TEXT,revision INTEGER,pending INTEGER); CREATE TABLE IF NOT EXISTS revisions(id TEXT PRIMARY KEY,scope TEXT,source TEXT,quote TEXT,before_state TEXT,after_state TEXT,revision INTEGER,created REAL);')
    def get(self,scope):
        row=self.db.execute('SELECT settings,revision,pending FROM styles WHERE scope=?',(scope,)).fetchone()
        return (json.loads(row[0]),row[1],bool(row[2])) if row else ({},0,False)
    def learn(self,job,cfg,changes,quote):
        if not eligible(job,cfg) or quote not in job.get('text','') or not feedback_text(quote):raise ValueError('Current explicit owner style feedback required')
        if not isinstance(changes,dict) or not changes or len(changes)>len(RULES) or any(key not in RULES or value not in RULES[key] for key,value in changes.items()):raise ValueError('Only supported speaking preferences may change')
        scope=job['scope']+':'+job['avatar'];before,revision,pending=self.get(scope);after={**before,**changes}
        if after==before:return {'changed':False,'revision':revision}
        identity=hashlib.sha256((job['id']+json.dumps(changes,sort_keys=True)).encode()).hexdigest()
        with self.db:
            if self.db.execute('SELECT 1 FROM revisions WHERE id=?',(identity,)).fetchone():return {'changed':False,'revision':revision}
            self.db.execute('INSERT INTO revisions VALUES(?,?,?,?,?,?,?,?)',(identity,scope,job['id'],quote[:2000],json.dumps(before),json.dumps(after),revision+1,time.time()))
            self.db.execute('INSERT OR REPLACE INTO styles VALUES(?,?,?,1)',(scope,json.dumps(after),revision+1))
        return {'changed':True,'revision':revision+1}
    def project(self,scope,text):
        clean=re.sub(re.escape(START)+r'.*?'+re.escape(END),'',text,flags=re.S).rstrip()
        settings,revision,_=self.get(scope)
        if not settings:return clean
        return clean+'\n\n'+START+'\n这些是当前用户明确反馈形成的表达偏好，按最新版本适用，不改变角色身份或事实。\n'+'\n'.join(RULES[k][v] for k,v in settings.items())+'\n'+END
    def rollback(self,job,cfg):
        if not eligible(job,cfg) or not re.search(r'(?:撤销|回退|恢复).{0,10}(?:上次|上一个|以前).{0,10}(?:风格|聊天)|撤销.{0,6}风格修改',job.get('text','')):raise ValueError('Explicit style rollback required')
        scope=job['scope']+':'+job['avatar'];before,revision,_=self.get(scope)
        previous=self.db.execute('SELECT before_state FROM revisions WHERE scope=? ORDER BY revision DESC LIMIT 1',(scope,)).fetchone()
        if not previous:return False
        identity='rollback:'+job['id']
        with self.db:
            if self.db.execute('SELECT 1 FROM revisions WHERE id=?',(identity,)).fetchone():return False
            self.db.execute('INSERT INTO revisions VALUES(?,?,?,?,?,?,?,?)',(identity,scope,job['id'],job['text'],json.dumps(before),previous[0],revision+1,time.time()))
            self.db.execute('INSERT OR REPLACE INTO styles VALUES(?,?,?,1)',(scope,previous[0],revision+1))
        return True
    def sync_card(self,job,cfg):
        scope=job['scope']+':'+job['avatar'];settings,revision,pending=self.get(scope)
        if not pending:return False
        current=json.loads((self.root/'local/tavern.json').read_text(encoding='utf-8'))
        if current['roles'][job['scope']]!=cfg['roles'][job['scope']]:raise ValueError('Selected role changed before style update')
        with httpx.Client(base_url='http://127.0.0.1:18020',trust_env=False,timeout=10) as client:
            client.headers['X-CSRF-Token']=client.get('/csrf-token').json()['token']
            response=client.post('/api/characters/get',json={'avatar_url':job['avatar']});response.raise_for_status();card=response.json()
            description=card.get('data',{}).get('description',card.get('description',''))
            if not description:raise ValueError('Missing live card description')
            backup=self.root/'runtime/backups/style-evolution'/hashlib.sha256(scope.encode()).hexdigest()[:16]
            backup.mkdir(parents=True,exist_ok=True);original=backup/(str(revision)+'.json')
            if not original.exists():original.write_text(json.dumps(card,ensure_ascii=False,indent=2),encoding='utf-8')
            text=self.project(scope,description)
            response=client.post('/api/characters/merge-attributes',json={'avatar':job['avatar'],'description':text,'data':{'description':text}});response.raise_for_status()
            check=client.post('/api/characters/get',json={'avatar_url':job['avatar']});check.raise_for_status()
            if check.json().get('data',{}).get('description')!=text:raise ValueError('Card update did not persist')
        with self.db:self.db.execute('UPDATE styles SET pending=0 WHERE scope=? AND revision=?',(scope,revision))
        return True

def prepare(job,cfg,persona):
    store=Styles()
    try:
        changes=detect(job.get('text','')) if eligible(job,cfg) else {}
        if eligible(job,cfg) and re.search(r'(?:撤销|回退|恢复).{0,10}(?:上次|上一个|以前).{0,10}(?:风格|聊天)|撤销.{0,6}风格修改',job.get('text','')):store.rollback(job,cfg)
        if changes:store.learn(job,cfg,changes,job['text'])
        scope=job['scope']+':'+job['avatar']
        if not job.get('evaluation'):
            try:store.sync_card(job,cfg)
            except (OSError,ValueError,httpx.HTTPError):pass # Pending sync survives; this turn still receives the new style.
        return store.project(scope,persona)
    finally:store.db.close()

def main():
    request=json.loads(sys.argv[1]);jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'));job=jobs[request['job_id']]
    cfg=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'));store=Styles()
    try:
        result=store.learn(job,cfg,{request['dimension']:request['preference']},request['quote'])
        result['card_updated']=store.sync_card(job,cfg)
        print(json.dumps(result,ensure_ascii=False))
    finally:store.db.close()

if __name__=='__main__':main()
