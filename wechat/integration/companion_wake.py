"""Role-bound, bounded followups. Durable claim precedes generation and send."""
import datetime,hashlib,json,re,sqlite3,time,sys
from privacy_policy import ROOT,PRIVATE_PEER

def is_stop_message(text):
    return bool(re.search(r'暂停陪伴|关闭陪伴|停止陪伴|别发了|不要再发|不用陪|不需要陪|我要睡|我去睡|晚安|睡吧|快睡|睡觉去|明天见|我先忙|我去忙|先不聊',text))

def role_token(role):
    return json.dumps({key:role.get(key) for key in ('avatar','chatFile','revision')},sort_keys=True,ensure_ascii=False)

def legacy_used(root=ROOT,now=None):
    now=time.time() if now is None else now
    count=0
    for file in (root/'runtime').glob('companion-*.sqlite'):
        if not re.fullmatch(r'companion-(?:followup|[0-9a-f]{16})\.sqlite',file.name):continue
        db=sqlite3.connect('file:'+file.as_posix()+'?mode=ro',uri=True,timeout=2)
        try:
            count+=db.execute("SELECT count(*) FROM sent WHERE state IN ('preparing','sent','uncertain') AND updated>?",(now-1800,)).fetchone()[0]
        finally:db.close()
    return count

class WakeStore:
    def __init__(self,path=None,policy=None):
        if policy is None:
            policy_file=ROOT/'local/autonomy.json'
            policy=json.loads(policy_file.read_text(encoding='utf-8')) if path is None and policy_file.exists() else {}
        self.autonomous=policy.get('private_self_followup') is True
        self.high=policy.get('high_autonomy') is True
        self.daily_limit=0 if self.high else 8
        self.short_limit=0 if self.high else 3
        self.db=sqlite3.connect(path or ROOT/'runtime/companion-wake.sqlite',timeout=5)
        self.db.row_factory=sqlite3.Row
        self.db.executescript('CREATE TABLE IF NOT EXISTS owner(id INTEGER PRIMARY KEY,revision INTEGER,event TEXT,paused INTEGER,updated REAL); CREATE TABLE IF NOT EXISTS wakes(id TEXT PRIMARY KEY,source TEXT,role TEXT,revision INTEGER,topic TEXT,due REAL,expires REAL,state TEXT,updated REAL);')
        if 'parent' not in {row[1] for row in self.db.execute('PRAGMA table_info(wakes)')}:
            self.db.execute('ALTER TABLE wakes ADD COLUMN parent TEXT');self.db.commit()
    def quiet(self,now):
        return self.autonomous and not self.high and datetime.datetime.fromtimestamp(now,datetime.timezone(datetime.timedelta(hours=8))).hour<8
    def daily_used(self,now):
        local=datetime.datetime.fromtimestamp(now,datetime.timezone(datetime.timedelta(hours=8)))
        start=local.replace(hour=0,minute=0,second=0,microsecond=0).timestamp()
        return self.db.execute("SELECT count(*) FROM wakes WHERE state IN ('preparing','sending','sent','uncertain','skipped') AND updated>=?",(start,)).fetchone()[0]
    def recover(self):
        self.db.execute("UPDATE wakes SET state='uncertain' WHERE state IN ('preparing','sending')");self.db.commit()
        self.db.execute("UPDATE wakes SET state='cancelled' WHERE state='pending' AND parent IN (SELECT id FROM wakes WHERE state IN ('uncertain','cancelled'))");self.db.commit()
    def observe(self,sender,target,text,event,now=None):
        if sender!=PRIVATE_PEER or target!=PRIVATE_PEER:return
        now=time.time() if now is None else now
        old=self.db.execute('SELECT revision,event,paused FROM owner WHERE id=1').fetchone()
        paused=is_stop_message(text)
        if old and old['event']==event:
            if paused and not old['paused']:
                self.db.execute('UPDATE owner SET paused=1 WHERE id=1')
                self.db.execute("UPDATE wakes SET state='cancelled',updated=? WHERE state='pending'",(now,));self.db.commit()
            return
        self.db.execute('INSERT OR REPLACE INTO owner VALUES(1,?,?,?,?)',((old['revision']+1) if old else 1,event,int(paused),now))
        self.db.execute("UPDATE wakes SET state='cancelled',updated=? WHERE state='pending'",(now,));self.db.commit()
    def used(self,now=None):
        now=time.time() if now is None else now
        return self.db.execute("SELECT count(*) FROM wakes WHERE state IN ('preparing','sending','sent','uncertain') AND updated>?",(now-1800,)).fetchone()[0]
    def schedule(self,job,role,minutes,topic,now=None,external_used=0):
        now=time.time() if now is None else now
        maximum=10080 if self.high else 360 if self.autonomous else 30
        if isinstance(minutes,bool) or not isinstance(minutes,(float,int)) or not 3<=minutes<=maximum:raise ValueError(f'Followup delay must be 3-{maximum} minutes')
        if not isinstance(topic,str) or not 1<=len(topic.strip())<=300:raise ValueError('A short followup topic is required')
        source=job['id'].replace('wechat:vision:','wechat:',1)
        owner=self.db.execute('SELECT * FROM owner WHERE id=1').fetchone()
        parent=None
        if job.get('kind','').startswith('runtime:'):
            evidence=json.loads(job.get('turnContext') or '{}')
            parent=self.db.execute('SELECT * FROM wakes WHERE id=?',(evidence.get('wake_id'),)).fetchone()
            from autonomy_policy import allowed
            daily=self.high and not parent and allowed(job,now=now)
            if not daily and (not self.autonomous or not parent or parent['state']!='preparing' or evidence.get('source_event')!=parent['source'] or not self.valid(parent,role,now)):raise ValueError('No live autonomous parent activity')
        elif not owner or owner['paused'] or owner['event']!=source or now-owner['updated']>1800:raise ValueError('No current awake owner turn; cannot arm followup')
        if job.get('avatar')!=role.get('avatar') or job.get('chatFile')!=role.get('chatFile'):raise ValueError('Role changed')
        identity=hashlib.sha256((job['id']+role_token(role)).encode()).hexdigest()[:24]
        previous=self.db.execute('SELECT * FROM wakes WHERE id=?',(identity,)).fetchone()
        if previous:return dict(previous)
        expires=now+365*86400 if self.high else parent['expires'] if parent else owner['updated']+(86400 if self.autonomous else 1800)
        due=min(now+minutes*60,expires)
        if self.quiet(due):
            due=datetime.datetime.fromtimestamp(due,datetime.timezone(datetime.timedelta(hours=8))).replace(hour=8,minute=0,second=0,microsecond=0).timestamp()
        if due-now<180 or due>=expires or (self.short_limit and self.used(now)+external_used>=self.short_limit) or (self.autonomous and self.daily_limit and self.daily_used(now)>=self.daily_limit):raise ValueError('Followup window or budget exhausted')
        self.db.execute("UPDATE wakes SET state='cancelled',updated=? WHERE state='pending'",(now,))
        self.db.execute('INSERT INTO wakes(id,source,role,revision,topic,due,expires,state,updated,parent) VALUES(?,?,?,?,?,?,?,?,?,?)',(identity,job['id'],role_token(role),owner['revision'],topic.strip(),due,expires,'pending',now,parent['id'] if parent else None));self.db.commit()
        return dict(self.db.execute('SELECT * FROM wakes WHERE id=?',(identity,)).fetchone())
    def cancel(self):
        self.db.execute("UPDATE wakes SET state='cancelled' WHERE state='pending'");self.db.commit()
    def status(self,role,now=None):
        now=time.time() if now is None else now
        owner=self.db.execute('SELECT * FROM owner WHERE id=1').fetchone()
        pending=[dict(row) for row in self.db.execute("SELECT id,topic,due,expires FROM wakes WHERE state='pending' AND role=? AND expires>?",(role_token(role),now))]
        return dict(awake_turn=bool(owner and not owner['paused'] and now-owner['updated']<=1800),paused=bool(owner and owner['paused']),pending=pending,used_last_30_minutes=self.used(now),limit=self.short_limit or None,can_self_reschedule_from_runtime=self.autonomous,maximum_delay_minutes=10080 if self.high else 360 if self.autonomous else 30,autonomous_daily_limit=self.daily_limit if self.autonomous and self.daily_limit else None,used_today=self.daily_used(now),quiet_hours='00:00-08:00 Asia/Shanghai' if self.autonomous and not self.high else None,high_autonomy=self.high)
    def claim(self,role,external_used=0,now=None):
        now=time.time() if now is None else now
        self.db.execute('BEGIN IMMEDIATE')
        owner=self.db.execute('SELECT * FROM owner WHERE id=1').fetchone()
        revision=owner['revision'] if owner and not owner['paused'] else -1
        self.db.execute("UPDATE wakes SET state='cancelled',updated=? WHERE state='pending' AND (role!=? OR revision!=? OR expires<=?)",(now,role_token(role),revision,now))
        row=None
        self.db.execute("UPDATE wakes SET state='cancelled',updated=? WHERE state='pending' AND parent IN (SELECT id FROM wakes WHERE state IN ('uncertain','cancelled'))",(now,))
        if not self.quiet(now) and (not self.short_limit or self.used(now)+external_used<self.short_limit) and (not self.autonomous or not self.daily_limit or self.daily_used(now)<self.daily_limit):
            row=self.db.execute("SELECT * FROM wakes WHERE state='pending' AND due<=? AND (parent IS NULL OR parent IN (SELECT id FROM wakes WHERE state IN ('sent','skipped'))) ORDER BY due LIMIT 1",(now,)).fetchone()
            if row:self.db.execute("UPDATE wakes SET state='preparing',updated=? WHERE id=?",(now,row['id']))
        self.db.commit();return dict(row) if row else None
    def valid(self,row,role,now=None):
        now=time.time() if now is None else now
        owner=self.db.execute('SELECT * FROM owner WHERE id=1').fetchone()
        live=self.db.execute('SELECT state FROM wakes WHERE id=?',(row['id'],)).fetchone()
        return bool(owner and not owner['paused'] and not self.quiet(now) and owner['revision']==row['revision'] and role_token(role)==row['role'] and now<row['expires'] and live and live['state'] in ('preparing','sending'))
    def mark_sending(self,row):
        self.db.execute("UPDATE wakes SET state='sending',updated=? WHERE id=? AND state='preparing'",(time.time(),row['id']));self.db.commit()
    def finish(self,row,state):
        if state not in ('sent','uncertain','skipped','cancelled'):raise ValueError('Invalid terminal state')
        self.db.execute('UPDATE wakes SET state=?,updated=? WHERE id=?',(state,time.time(),row['id']));self.db.commit()

def main():
    request=json.loads(sys.argv[1]);jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'));job=jobs[request['job_id']]
    if job.get('state')!='running' or job.get('scope')!='private':raise ValueError('No active owner conversation')
    cfg=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'));role=cfg['roles']['private']
    if role['avatar']!=job['avatar']:raise ValueError('Role changed')
    store=WakeStore()
    try:
        operation=request.get('operation','status')
        if operation!='status':
            from dsh_policy import admitted
            genuine=job['kind']=='chat' and job['id'].startswith('wechat:')
            autonomous=store.autonomous and job['kind'].startswith('runtime:') and job['id'].startswith('runtime:')
            if not admitted(job,cfg) or job.get('evaluation') or not (genuine or autonomous):raise ValueError('Only current owner turn or authorized autonomous activity can change followups')
            if autonomous and operation=='cancel':raise ValueError('Runtime may skip its own activity; owner controls cancellation')
        external=legacy_used()
        if operation=='schedule':result=store.schedule(job,role,request.get('after_minutes'),request.get('topic'),external_used=external)
        elif operation=='cancel':store.cancel();result={'cancelled':True}
        elif operation=='status':
            result=store.status(role);result['legacy_used_last_30_minutes']=external;result['combined_used_last_30_minutes']=result['used_last_30_minutes']+external
        else:raise ValueError('Unknown followup operation')
        print(json.dumps(result,ensure_ascii=False))
    finally:store.db.close()

if __name__=='__main__':main()
