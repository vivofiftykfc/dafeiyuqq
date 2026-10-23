"""Owner-DM durable reminders. Claim before send, never retry uncertain delivery."""
import datetime as dt,re,sqlite3,time,uuid,hashlib,json,math
from privacy_policy import ROOT,PRIVATE_PEER
TZ=dt.timezone(dt.timedelta(hours=8))
class Reminders:
    def __init__(self,path=None):
        self.db=sqlite3.connect(path or ROOT/'runtime/reminders.sqlite')
        self.db.execute('CREATE TABLE IF NOT EXISTS reminders(id TEXT PRIMARY KEY,body TEXT,due REAL,repeat_seconds INTEGER,state TEXT,created REAL)');self.db.commit()
        columns={row[1] for row in self.db.execute('PRAGMA table_info(reminders)')}
        for column in ('source_id','source_job'):
            if column not in columns:self.db.execute('ALTER TABLE reminders ADD COLUMN '+column+' TEXT')
        self.db.execute('CREATE UNIQUE INDEX IF NOT EXISTS reminder_source ON reminders(source_id)')
        self.db.execute('CREATE TABLE IF NOT EXISTS reminder_attempts(id TEXT,due REAL,state TEXT,updated REAL,PRIMARY KEY(id,due))');self.db.commit()
    def recover(self):
        with self.db:
            self.db.execute("UPDATE reminders SET state='uncertain' WHERE state='sending'")
            self.db.execute("UPDATE reminder_attempts SET state='uncertain',updated=? WHERE state='sending'",(time.time(),))
    def create(self,body,due,repeat=0,now=None,source_job=None):
        now=time.time() if now is None else now
        if not isinstance(body,str) or not 1<=len(body.strip())<=500 or isinstance(due,bool) or not isinstance(due,(int,float)) or not math.isfinite(due) or repeat not in (0,86400,604800):raise ValueError('Invalid future reminder')
        dt.datetime.fromtimestamp(due,TZ)
        source=hashlib.sha256(json.dumps([source_job,body.strip(),due,repeat],ensure_ascii=False).encode()).hexdigest() if source_job else None
        with self.db:
            old=self.db.execute('SELECT id FROM reminders WHERE source_id=?',(source,)).fetchone() if source else None
            if old:return self.get(old[0])
            if due<=now:raise ValueError('Reminder time has already passed')
            identity=uuid.uuid4().hex[:8]
            self.db.execute('INSERT INTO reminders(id,body,due,repeat_seconds,state,created,source_id,source_job) VALUES(?,?,?,?,?,?,?,?)',(identity,body.strip(),due,repeat,'pending',now,source,source_job))
        return self.get(identity)
    def get(self,identity):
        row=self.db.execute('SELECT id,body,due,repeat_seconds,state FROM reminders WHERE id=?',(identity,)).fetchone()
        if not row:return None
        attempts=[dict(scheduled_for=dt.datetime.fromtimestamp(d,TZ).isoformat(),state=s,updated_at=dt.datetime.fromtimestamp(u,TZ).isoformat()) for d,s,u in self.db.execute('SELECT due,state,updated FROM reminder_attempts WHERE id=? ORDER BY due DESC LIMIT 3',(identity,))]
        return dict(id=row[0],text=row[1],due_at=dt.datetime.fromtimestamp(row[2],TZ).isoformat(),repeat_seconds=row[3],state=row[4],attempts=attempts)
    def listing(self,include_completed=False):
        query='SELECT id FROM reminders ORDER BY created DESC LIMIT 100' if include_completed else "SELECT id FROM reminders WHERE state IN ('pending','sending','uncertain') ORDER BY due LIMIT 100"
        return [self.get(row[0]) for row in self.db.execute(query).fetchall()]
    def cancel(self,identity):
        with self.db:changed=self.db.execute("UPDATE reminders SET state='cancelled' WHERE id=? AND state IN ('pending','uncertain')",(identity,)).rowcount
        return {'id':identity,'cancelled':bool(changed),'note':'Cannot recall a message that may already have been sent'}
    def control(self,sender,target,text,now=None):
        if sender!=PRIVATE_PEER or target!=PRIVATE_PEER:return None
        now=time.time() if now is None else now;text=text.strip()
        if text in ('查看提醒','我的提醒','提醒列表'):
            rows=self.db.execute("SELECT id,body,due,state FROM reminders WHERE state IN ('pending','sending','uncertain') ORDER BY due LIMIT 20").fetchall()
            return '\n'.join(f'{i} · {dt.datetime.fromtimestamp(d,TZ):%m-%d %H:%M} · {b} [{s}]' for i,b,d,s in rows) or '目前没有待办提醒'
        cancel=re.fullmatch(r'取消提醒\s+([a-f0-9]{8})',text)
        if cancel:
            cur=self.db.execute("UPDATE reminders SET state='cancelled' WHERE id=? AND state='pending'",(cancel[1],));self.db.commit()
            return '已取消这条提醒' if cur.rowcount else '没找到可取消的待办提醒；已进入发送的提醒不能撤回'
        pattern=r'^(?:(\d{1,5})(分钟|小时)后|(?:(今天|明天|每天)|(\d{4}-\d{2}-\d{2}))\s*(\d{1,2})[:：点](\d{1,2})?分?)\s*提醒我\s*(.{1,500})$'
        m=re.fullmatch(pattern,text,re.S)
        if not m:return None
        amount,unit,day,date,hour,minute,body=m.groups();repeat=0
        try:
            if amount:due=now+int(amount)*(60 if unit=='分钟' else 3600)
            else:
                current=dt.datetime.fromtimestamp(now,TZ)
                dateval=dt.date.fromisoformat(date) if date else current.date()+dt.timedelta(days=1 if day=='明天' else 0)
                when=dt.datetime.combine(dateval,dt.time(int(hour),int(minute or 0)),TZ)
                if day=='每天':
                    repeat=86400
                    if when.timestamp()<=now:when+=dt.timedelta(days=1)
                due=when.timestamp()
            if not now<due:raise ValueError()
        except ValueError:return '提醒时间无效或已经过去；请写未来的日期时间，例如“明天9:30提醒我交作业”'
        identity=self.create(body,due,repeat,now)['id']
        return f'记好了：{dt.datetime.fromtimestamp(due,TZ):%Y-%m-%d %H:%M} 提醒你{body}'+('（每天）' if repeat else '')+f'。编号 {identity}；小号服务在线时发送，离线恢复后补提醒。'
    def claim(self,now=None):
        now=time.time() if now is None else now
        self.db.execute('BEGIN IMMEDIATE')
        row=self.db.execute("SELECT id,body,due,repeat_seconds FROM reminders WHERE state='pending' AND due<=? ORDER BY due LIMIT 1",(now,)).fetchone()
        if row:
            self.db.execute("UPDATE reminders SET state='sending' WHERE id=?",(row[0],))
            self.db.execute('INSERT INTO reminder_attempts VALUES(?,?,?,?)',(row[0],row[2],'sending',now))
        self.db.commit();return row
    def finish(self,row,ok,now=None):
        now=time.time() if now is None else now;i,body,due,repeat=row
        self.db.execute('UPDATE reminder_attempts SET state=?,updated=? WHERE id=? AND due=?',('sent' if ok else 'uncertain',now,i,due))
        if ok and repeat:
            due+= (int(max(0,now-due)//repeat)+1)*repeat
            self.db.execute("UPDATE reminders SET state='pending',due=? WHERE id=?",(due,i))
        else:self.db.execute('UPDATE reminders SET state=? WHERE id=?',('sent' if ok else 'uncertain',i))
        self.db.commit()
