"""Explicit, bounded owner-DM companionship; no group or implicit emotion trigger."""
import json,re,sqlite3,time,tomllib
from privacy_policy import ROOT,PRIVATE_PEER

class CompanionFollowup:
    def __init__(self,root=ROOT):
        self.root=root;self.role=__import__('role_state').key(PRIVATE_PEER);self.db=sqlite3.connect(root/'runtime'/('companion-followup.sqlite' if __import__('role_state').selected(PRIVATE_PEER)['avatar']=='小鲸鱼私聊.png' else 'companion-'+self.role+'.sqlite'))
        self.db.executescript('CREATE TABLE IF NOT EXISTS session(id INTEGER PRIMARY KEY,revision INTEGER,remaining INTEGER,due REAL,expires REAL); CREATE TABLE IF NOT EXISTS sent(id TEXT PRIMARY KEY,text TEXT,state TEXT,updated REAL);')
    def ensure_role(self):
        from role_state import key,selected
        current=key(PRIVATE_PEER)
        if current==self.role:return
        self.db.execute('UPDATE session SET remaining=0');self.db.commit();self.db.close()
        filename='companion-followup.sqlite' if selected(PRIVATE_PEER)['avatar']=='小鲸鱼私聊.png' else 'companion-'+current+'.sqlite'
        self.db=sqlite3.connect(self.root/'runtime'/filename);self.role=current
        self.db.executescript('CREATE TABLE IF NOT EXISTS session(id INTEGER PRIMARY KEY,revision INTEGER,remaining INTEGER,due REAL,expires REAL); CREATE TABLE IF NOT EXISTS sent(id TEXT PRIMARY KEY,text TEXT,state TEXT,updated REAL);')
        self.db.execute('UPDATE session SET remaining=0');self.db.commit()
    def observe(self,sender,target,text,now=None):
        self.ensure_role()
        if sender!=PRIVATE_PEER or target!=PRIVATE_PEER:return
        now=time.time() if now is None else now
        row=self.db.execute('SELECT revision,remaining,due,expires FROM session WHERE id=1').fetchone()
        revision=(row[0]+1) if row else 1
        # Literal direct controls only; quoted/conditional discussions cannot arm it.
        value=text.strip().strip('。！!~～ ')
        value=re.sub(r'(?:喵|呀|啦|吧|哦|呢)+$','',value).strip()
        from companion_wake import is_stop_message
        stop=is_stop_message(value)
        start=value in ('开启陪伴模式','陪伴模式','陪我多说一会儿','陪我多说一会','你继续说，我听着','继续陪我聊一会儿')
        if stop:self.db.execute('INSERT OR REPLACE INTO session VALUES(1,?,0,0,0)',(revision,))
        elif start:self.db.execute('INSERT OR REPLACE INTO session VALUES(1,?,3,?,?)',(revision,now+180,now+1800))
        elif row and row[1]>0 and now<row[3]:self.db.execute('UPDATE session SET revision=?,due=? WHERE id=1',(revision,now+180))
        self.db.commit()
    def due(self,now=None):
        self.ensure_role()
        now=time.time() if now is None else now
        row=self.db.execute('SELECT revision,remaining,due,expires FROM session WHERE id=1').fetchone()
        return row if row and row[1]>0 and row[2]<=now<row[3] else None
    def claim(self,row,now=None):
        now=time.time() if now is None else now
        if self.due(now)!=row:return None
        key=f'companion:{row[0]}:{row[1]}:{int(row[3])}'
        self.db.execute('INSERT INTO sent VALUES(?,?,?,?)',(key,'','preparing',now))
        self.db.execute('UPDATE session SET remaining=remaining-1,due=? WHERE id=1',(now+300,));self.db.commit();return key
    def valid(self,revision,now=None):
        now=time.time() if now is None else now
        r=self.db.execute('SELECT revision,expires FROM session WHERE id=1').fetchone()
        return bool(r and r[0]==revision and now<r[1])
    def record(self,key,text,state):
        self.db.execute('UPDATE sent SET text=?,state=?,updated=? WHERE id=?',(text,state,time.time(),key));self.db.commit()
    def context(self):
        self.ensure_role()
        r=self.db.execute('SELECT remaining,expires FROM session WHERE id=1').fetchone()
        enabled=bool(r and r[0]>0 and r[1]>time.time())
        recent=self.db.execute("SELECT text FROM sent WHERE state='sent' AND updated>? ORDER BY updated DESC LIMIT 3",(time.time()-3600,)).fetchall()
        return '[私聊陪伴调度状态：'+('已开启，限本次半小时内最多三次沉默跟进' if enabled else '当前未开启；不能承诺持续主动发送')+'。可用“开启陪伴模式/陪我多说一会儿”开启，“暂停陪伴”停止。实际已发送的后续消息：'+json.dumps([x[0] for x in recent],ensure_ascii=False)+']\n'
    async def compose(self,context):
        self.ensure_role()
        import httpx
        cfg=json.loads((self.root/'local/config.json').read_text(encoding='utf-8-sig'))
        from role_state import persona as role_persona
        persona=role_persona(PRIVATE_PEER)
        previous=[]  # Recent per-role dialogue is already supplied in context.
        prompt='用户开启了短时陪伴，现在几分钟没有新消息。先判断此刻是否真的适合再说话，默认返回<SKIP>。沉默不表示需要更多解释。禁止继续点评或解读刚聊过的梦、经历和心理；禁止用“还有个细节”“再补充一点”延长已完成回复，也不要换词重复安慰。只有上下文中仍有明确未回应的陪伴需要，而且你有自然、不同于上一条的话可说，才发简短正文。不催回复、不假装知道他正在做什么、不编经历、不引入群聊、不调用或承诺工具。话题结束、用户换话题、要忙或睡、正在等工具时返回<SKIP>。不要输出判断过程。'
        from tavern_client import enabled, runtime_event
        if enabled('private'):
            reply=await runtime_event(PRIVATE_PEER,prompt,{'recent':context})
            text=reply.strip()
            return reply if text and text!='<SKIP>' and len(text)<=650 else None
        async with httpx.AsyncClient(timeout=90,trust_env=False) as c:
            r=await c.post('https://api.deepseek.com/v1/chat/completions',headers={'Authorization':'Bearer '+cfg['api_key']},json={'model':'deepseek-flash','thinking':{'type':'enabled'},'reasoning_effort':'high','max_tokens':8192,'messages':[{'role':'system','content':persona+'\n'+prompt},{'role':'user','content':json.dumps({'context':context,'previous_followups':previous},ensure_ascii=False)}]})
            r.raise_for_status();choice=r.json()['choices'][0];text=(choice['message'].get('content') or '').strip()
            if choice.get('finish_reason')!='stop' or not text or text=='<SKIP>' or len(text)>650:return None
            return text
