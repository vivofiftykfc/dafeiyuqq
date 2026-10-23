"""One group speech gate for text, pictures and accepted native deliveries.

Admission never changes identity, tool permissions or private conversation rules.
"""
import hashlib,random,re,time
from privacy_policy import GROUP_PEER

SELF='wxid_bot'

class SpeechSuppressed(Exception):pass

def acknowledgment(text):
    return bool(re.fullmatch(r'[\s，,。.!！?？~～…]*(?:6+|哈+|呵+|嗯+|哦+|好(?:的|呀|吧)?|行+|对+|是的|确实|笑死|谢谢|谢了|收到|明白了|知道了|😂|🤣|👍|👌)[\s，,。.!！?？~～…]*',text))

class GroupSpeech:
    def __init__(self,db,target):
        if target!=GROUP_PEER:raise ValueError('This speech policy is only for the bound work group')
        self.db=db;self.target=target;self.claims={}
        db.execute('CREATE TABLE IF NOT EXISTS group_speech_deliveries(source TEXT PRIMARY KEY,target TEXT,mode TEXT,peer TEXT,stamp REAL,status TEXT)');db.commit()
        if 'expects_image' not in {row[1] for row in db.execute('PRAGMA table_info(group_speech_deliveries)')}:
            db.execute('ALTER TABLE group_speech_deliveries ADD COLUMN expects_image INTEGER NOT NULL DEFAULT 0');db.commit()
        db.execute('CREATE TABLE IF NOT EXISTS group_speech_decisions(source TEXT PRIMARY KEY,target TEXT,reason TEXT,mode TEXT,stamp REAL)');db.commit()
    def last(self):
        row=self.db.execute("SELECT source,CASE WHEN status='accepted' THEN peer ELSE NULL END,stamp,expects_image FROM group_speech_deliveries WHERE target=? ORDER BY stamp DESC LIMIT 1",(self.target,)).fetchone()
        # A bridge upgrade must not forget a recent accepted or uncertain send.
        legacy=self.db.execute("SELECT max(updated) FROM receipts WHERE target=? AND state IN ('sent','native_accepted','sending','uncertain')",(self.target,)).fetchone()[0]
        if legacy is not None and (not row or legacy>row[2]+.01):return ('legacy-native-delivery',None,legacy,0)
        return row
    def admit(self,source,data,names=(),now=None,draw=None):
        now=time.time() if now is None else now
        for key,value in list(self.claims.items()):
            if now-value['started']>600:self.claims.pop(key,None)
        if data.get('chat_id')!=self.target:return {'allowed':False,'reason':'wrong_conversation'}
        if source in self.claims:return self.claims[source] if self.claims[source]['active'] else {'allowed':False,'reason':'closed_turn'}
        text=str(data.get('msg',''));mentions=set(data.get('at_members',()))
        image=bool(data.get('xml')) or data.get('message_type') in (3,47)
        addressed=bool(data.get('is_at_self')) or any(name and name.casefold() in text.casefold() for name in names)
        ref=data.get('reference') or {};direct=addressed or ref.get('sender')==SELF
        last=self.last();peer=data.get('sender_id')
        reason='explicit_address' if direct else 'not_selected';mode='direct' if direct else 'unsolicited'
        if not direct:
            if (mentions and SELF not in mentions) or ref.get('sender') not in (None,'',SELF):reason='addressed_other_member'
            elif not image and acknowledgment(text):reason='standalone_acknowledgment'
            elif last and last[1]==peer and 0<=now-last[2]<=75 and (not image or last[3]):mode='continuation';reason='same_member_continuation'
            elif any(row['active'] and now-row['started']<240 for row in self.claims.values()):reason='reply_already_in_progress'
            elif last and now-last[2]<120:reason='recent_native_delivery'
            elif self.db.execute("SELECT count(*) FROM group_speech_deliveries WHERE target=? AND mode='unsolicited' AND stamp>?",(self.target,now-600)).fetchone()[0]>=2:reason='unsolicited_budget'
            else:
                interested=bool(re.search(r'\bAI\b|deepseek|编程|代码|数学|物理|电影|游戏|鲸鱼',text,re.I))
                probability=.12 if image else .15 if interested else .05
                if (random.random() if draw is None else draw)<probability:reason='optional_candidate'
                else:reason='optional_not_selected'
        allowed=direct or mode=='continuation' or reason=='optional_candidate'
        result={'source':source,'peer':peer,'mode':mode,'allowed':allowed,'reason':reason,'started':now,'active':allowed,'arrival_stamp':data.get('arrival_stamp')}
        if allowed:self.claims[source]=result
        self.db.execute('INSERT OR IGNORE INTO group_speech_decisions VALUES(?,?,?,?,?)',(source,self.target,reason,mode,now));self.db.commit()
        return result
    def finish(self,source):
        if source in self.claims:self.claims[source]['active']=False
    def origin(self,message_id):
        value=message_id
        for prefix in ('reaction:','tavern:'):
            if value.startswith(prefix):value=value[len(prefix):]
        if value.startswith(('sticker-tool:','media-tool:')):
            return next((source for source,row in self.claims.items() if row['active'] and value==value.split(':',1)[0]+':'+hashlib.sha256(('wechat:'+source).encode()).hexdigest()[:24]),None)
        return value
    def may_deliver(self,source,now=None):
        now=time.time() if now is None else now;claim=self.claims.get(source)
        if not claim or not claim['active'] or now-claim['started']>240:return False
        if claim['mode']!='unsolicited':return True
        last=self.last()
        return not last or last[0]==source or last[2]<=claim['started']
    def may_append_reaction(self,source):
        last=self.last();return bool(source and last and last[0]==source)
    def record(self,message_id,status='accepted',now=None,text=''):
        now=time.time() if now is None else now;source=self.origin(message_id)
        if not source:return
        claim=self.claims.get(source,{})
        previous=self.db.execute('SELECT mode,peer FROM group_speech_deliveries WHERE source=?',(source,)).fetchone()
        mode=claim.get('mode') or (previous[0] if previous else 'external')
        peer=claim.get('peer') or (previous[1] if previous else None)
        expects_image=int(bool(re.search(r'你.{0,10}(?:发|贴).{0,6}(?:图|照片|截图)|(?:图|照片|截图).{0,8}(?:给我|发我|发来|过来)|(?:发|贴).{0,6}(?:图|照片|截图).{0,6}(?:给我|过来)|给我看看',text)))
        self.db.execute('INSERT INTO group_speech_deliveries VALUES(?,?,?,?,?,?,?) ON CONFLICT(source) DO UPDATE SET stamp=excluded.stamp,status=excluded.status,expects_image=max(group_speech_deliveries.expects_image,excluded.expects_image)',(source,self.target,mode,peer,now,status,expects_image));self.db.commit()
