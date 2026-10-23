"""Per-conversation roleplay life ledger, bounded proactive text sharing."""
import datetime,hashlib,json,sqlite3,time
import httpx
from privacy_policy import ROOT,PRIVATE_PEER,GROUP_PEER

def scope_for(target):
    if target==PRIVATE_PEER:return 'private'
    if target==GROUP_PEER:return 'group'
    raise ValueError('Unknown target')

class DailyLife:
    def __init__(self,root=ROOT):
        self.root=root
        self.path=root/'runtime/daily-life.sqlite'
        self.db=sqlite3.connect(self.path)
        self.db.execute('CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY,scope TEXT,day TEXT,state TEXT,body TEXT,updated REAL)')
        self.db.execute('CREATE TABLE IF NOT EXISTS preferences(scope TEXT PRIMARY KEY,enabled INTEGER)')
        self.db.commit()

    def control(self,sender,target,text):
        if sender!=PRIVATE_PEER:return None
        if text.strip() not in ('暂停日常','恢复日常'):return None
        scope=scope_for(target);enabled=text.strip()=='恢复日常'
        self.db.execute('INSERT OR REPLACE INTO preferences VALUES(?,?)',(scope,int(enabled)));self.db.commit()
        return '这个会话的日常分享已'+('恢复' if enabled else '暂停')

    def due(self,target,now=None,last_received=0):
        scope=scope_for(target);now=time.time() if now is None else now
        local=datetime.datetime.fromtimestamp(now,datetime.timezone(datetime.timedelta(hours=8)))
        pref=self.db.execute('SELECT enabled FROM preferences WHERE scope=?',(scope,)).fetchone()
        if pref and not pref[0]:return None
        if now-last_received<900:return None
        day=local.date().isoformat();minute=local.hour*60+local.minute
        from autonomy_policy import enabled as autonomy_enabled
        if scope=='private' and autonomy_enabled(self.root):
            key=f'{scope}:{day}:autonomy-{local.hour}'
            return None if self.db.execute('SELECT 1 FROM entries WHERE id=?',(key,)).fetchone() else key
        # Stable daily jitter; restarting cannot trigger a burst or reset the cap.
        jitter=int(hashlib.sha256((day+scope).encode()).hexdigest()[:4],16)%90
        windows=[(12*60+jitter,16*60),(19*60+jitter,23*60)] if scope=='group' else [(11*60+jitter,15*60),(19*60+jitter,23*60)]
        for i,(start,end) in enumerate(windows):
            key=f'{scope}:{day}:{i}'
            if start<=minute<end and not self.db.execute('SELECT 1 FROM entries WHERE id=?',(key,)).fetchone():return key
        return None

    def reserve(self,key,target):
        scope=scope_for(target)
        if not key.startswith(scope+':'):raise ValueError('Scope mismatch')
        try:self.db.execute('INSERT INTO entries VALUES(?,?,?,?,?,?)',(key,__import__('role_state').memory_scope(target),key.split(':')[1],'preparing','',time.time()));self.db.commit();return True
        except sqlite3.IntegrityError:return False

    def record(self,key,state,body=''):
        self.db.execute('UPDATE entries SET state=?,body=?,updated=? WHERE id=?',(state,body,time.time(),key));self.db.commit()

    async def compose(self,target,key=None):
        scope=scope_for(target)
        previous=[r[0] for r in self.db.execute("SELECT body FROM entries WHERE scope=? AND state='sent' ORDER BY updated DESC LIMIT 5",(__import__('role_state').memory_scope(target),))]
        from role_state import persona as role_persona,memory_scope
        persona=role_persona(target)
        cfg=json.loads((self.root/'local/config.json').read_text(encoding='utf-8-sig'))
        prompt='这是你自主活动的机会，不是必须完成的问候任务。先看看自己最近真正感兴趣的内容和此前分享，自己决定是否继续读一个公开来源、想一个小点子，或者今天先安静。可以用本轮已有的搜索、阅读和历史工具；查过再说查过，想做不等于已做。有新发现或具体想法才自然分享，允许有自己的审美、意见和轻微小脾气，不必每次围绕主人、不套安慰模板、不催回复；没值得说的就输出<SKIP>。不要编造现实生活和共同经历。一次一件事，正文最多180字。'+('这是群聊，不叫大家主人，不提私聊。' if scope=='group' else '这是与你私聊的用户，关系与称呼遵照角色卡。')
        from tavern_client import enabled, runtime_event
        if enabled(scope):
            from companion_wake import WakeStore
            store=WakeStore()
            try:
                owner=store.db.execute('SELECT revision FROM owner WHERE id=1').fetchone()
                evidence={'previous_shares':previous,'daily_key':key,'owner_revision':owner[0] if owner else None}
            finally:store.db.close()
            text=(await runtime_event(target,prompt,evidence)).strip()
            if not text or text=='<SKIP>' or len(text)>180:raise RuntimeError('Daily event skipped')
            return text
        async with httpx.AsyncClient(timeout=90) as client:
            r=await client.post('https://api.deepseek.com/v1/chat/completions',headers={'Authorization':'Bearer '+cfg['api_key']},json={'model':'deepseek-flash','thinking':{'type':'enabled'},'reasoning_effort':'high','max_tokens':8192,'messages':[{'role':'system','content':persona},{'role':'user','content':prompt+' 本会话此前日常：'+json.dumps(previous,ensure_ascii=False)}]})
            r.raise_for_status();choice=r.json()['choices'][0]
            if choice.get('finish_reason')!='stop':raise RuntimeError('Incomplete daily message')
            text=choice['message']['content'].strip()
            if not text or len(text)>180:raise RuntimeError('Daily message too long')
            return text
