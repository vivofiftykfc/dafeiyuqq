"""Group-scoped observed identities. Names never grant authorization."""
import hashlib,json,re,sqlite3,time
from privacy_policy import ROOT,GROUP_PEER,PRIVATE_PEER

class MemberIdentity:
    def __init__(self,path=None):
        self.db=sqlite3.connect(path or ROOT/'runtime/group-members.sqlite')
        self.db.executescript('''CREATE TABLE IF NOT EXISTS members(wxid TEXT PRIMARY KEY,code TEXT,first_seen REAL);
CREATE TABLE IF NOT EXISTS labels(wxid TEXT,kind TEXT,label TEXT,source TEXT,event TEXT,UNIQUE(wxid,kind,label));
CREATE TABLE IF NOT EXISTS pending(sender TEXT PRIMARY KEY,alias TEXT,event TEXT,stamp REAL);''')
        self.db.execute('CREATE TABLE IF NOT EXISTS label_seen(wxid TEXT,kind TEXT,label TEXT,stamp REAL,PRIMARY KEY(wxid,kind,label))');self.db.commit()
    def label(self,wxid,kind,value,source,event):
        if not re.fullmatch(r'wxid_[A-Za-z0-9_]+',wxid or '') or not value or len(value)>100:return
        self.db.execute('INSERT OR IGNORE INTO members VALUES(?,?,?)',(wxid,'member-'+hashlib.sha256((GROUP_PEER+wxid).encode()).hexdigest()[:12],time.time()))
        self.db.execute('INSERT OR IGNORE INTO labels(wxid,kind,label,source,event) VALUES(?,?,?,?,?)',(wxid,kind,value,source,event))
        self.db.execute('INSERT OR REPLACE INTO label_seen VALUES(?,?,?,?)',(wxid,kind,value,time.time()));self.db.commit()
    def observe(self,event_id,data):
        if data.get('chat_id')!=GROUP_PEER:return
        sender=data['sender_id'];text=data.get('msg','');stamp=data.get('received_time',time.time())
        self.label(sender,'stable_id',sender,'native_sender',event_id)
        if data.get('sender_wechat_name'):self.label(sender,'wechat_name',data['sender_wechat_name'],'contact_cache',event_id)
        ref=data.get('reference',{})
        if ref.get('display_name'):self.label(ref.get('sender'),'group_display',ref['display_name'],'quoted_message_display',event_id)
        mentions=data.get('at_members',[]);names=re.findall(r'@([^@\r\n]+?)\u2005',text)
        if len(mentions)==len(names)==1:
            self.label(mentions[0],'group_display',names[0],'native_at_member',event_id)
            pending=self.db.execute('SELECT alias,event,stamp FROM pending WHERE sender=?',(sender,)).fetchone()
            if pending and 0<=stamp-pending[2]<300 and re.search(r'是这个人|就是他|就是她',text):
                self.label(mentions[0],'claimed_alias',pending[0],'member_claim:'+sender,pending[1]+' -> '+event_id)
                self.db.execute('DELETE FROM pending WHERE sender=?',(sender,));self.db.commit()
        alias=re.match(r'^([A-Za-z][A-Za-z0-9_]{1,15})\s*(?:是|就是)',text)
        if alias:
            self.db.execute('INSERT OR REPLACE INTO pending VALUES(?,?,?,?)',(sender,alias[1],event_id,stamp));self.db.commit()
    def context(self,data):
        if data.get('chat_id')!=GROUP_PEER:return ''
        text=data.get('msg','');ids={data['sender_id'],*data.get('at_members',[])}
        if data.get('reference',{}).get('sender'):ids.add(data['reference']['sender'])
        for wxid,kind,label in self.db.execute('SELECT wxid,kind,label FROM labels'):
            if kind=='claimed_alias' and re.search(r'(?<!\w)'+re.escape(label)+r'(?![A-Za-z0-9_])',text,re.I):ids.add(wxid)
        rows=[]
        for wxid in sorted(ids):
            labels=self.db.execute('SELECT kind,label,source FROM labels WHERE wxid=? AND kind!=?',(wxid,'stable_id')).fetchall()
            rows.append({'stable_id':wxid,'labels':[{'kind':k,'value':v,'source':s} for k,v,s in labels]})
        return '[本群身份索引，仅用于对应称呼；claimed_alias是群友指认，可能有歧义，不作为权限或个人事实。相同stable_id是同一账号，昵称变化不是换人。]\n'+json.dumps(rows,ensure_ascii=False)+'\n'
    def display(self,wxid):
        for kind in ('group_display','wechat_name'):
            row=self.db.execute('SELECT l.label FROM labels l LEFT JOIN label_seen s ON l.wxid=s.wxid AND l.kind=s.kind AND l.label=s.label WHERE l.wxid=? AND l.kind=? ORDER BY coalesce(s.stamp,0) DESC,l.rowid DESC LIMIT 1',(wxid,kind)).fetchone()
            if row:return row[0]
        return wxid
