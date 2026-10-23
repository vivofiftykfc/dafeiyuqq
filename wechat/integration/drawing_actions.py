"""Durable role-bound drawings requested by genuine owner chat tools."""
import asyncio,hashlib,json,sqlite3,sys,time
from privacy_policy import ROOT
from autonomy_policy import action_turn

def same_role(row,role):return row['avatar']==role.get('avatar') and (row['revision'] or None)==(role.get('revision') or None)

def autonomous_source_current(row):
 if not row['job_id'].startswith('runtime:'):return True
 from autonomy_policy import allowed
 try:
  job=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8')).get(row['job_id'],{})
  return allowed(job,delivery=True)
 except (OSError,ValueError):return False

async def execute(store,row,generate,send,selected,validate):
 try:
  current=store.db.execute('SELECT state FROM drawings WHERE id=?',(row['id'],)).fetchone()
  if not current or current['state'] not in ('generating','ready'):return current['state'] if current else 'missing'
  if not autonomous_source_current(row):store.finish(row['id'],'cancelled',error='Autonomous source paused or superseded');return 'cancelled'
  if not same_role(row,selected()):store.finish(row['id'],'cancelled',error='Role changed');return 'cancelled'
  path=row['path']
  if row['state']!='ready':
   path=await generate(row['prompt'],bool(row['depicts_self']))
   store.finish(row['id'],'ready',path=str(path))
  if not same_role(row,selected()):store.finish(row['id'],'cancelled',error='Role changed before delivery');return 'cancelled'
  if not autonomous_source_current(row):store.finish(row['id'],'cancelled',error='Autonomous source changed before delivery');return 'cancelled'
  validate(path);store.finish(row['id'],'sending')
  ok=await send(path,'drawing-tool:'+row['id'])
  state='native_accepted' if ok else 'uncertain';store.finish(row['id'],state);return state
 except asyncio.CancelledError:raise
 except Exception as error:
  store.finish(row['id'],'uncertain',error=type(error).__name__);return 'uncertain'

class Drawings:
 def __init__(self,path=None):
  self.db=sqlite3.connect(path or ROOT/'runtime/drawing-actions.sqlite',timeout=15);self.db.row_factory=sqlite3.Row
  self.db.execute('CREATE TABLE IF NOT EXISTS drawings(id TEXT PRIMARY KEY,job_id TEXT UNIQUE,avatar TEXT,revision TEXT,prompt TEXT,depicts_self INT,state TEXT,path TEXT,error TEXT,created REAL,updated REAL)');self.db.commit()
 def recover(self,receipts):
  for row in self.db.execute("SELECT id,state FROM drawings WHERE state IN ('generating','sending')").fetchall():
   receipt=receipts.execute('SELECT state FROM receipts WHERE id=?',('image:drawing-tool:'+row['id'],)).fetchone()
   state='native_accepted' if receipt and receipt[0]=='native_accepted' else 'uncertain'
   self.finish(row['id'],state,error='Recovered from interrupted operation; no automatic resubmission')
 def submit(self,job,role,prompt,depicts_self=False):
  if not action_turn(job) or job.get('scope')!='private':raise ValueError('Only owner chat or authorized autonomous activity can request drawing')
  if job.get('dshDeadline') and time.time()*1000>=job['dshDeadline']:raise ValueError('Source generation expired')
  if job.get('avatar')!=role.get('avatar') or (job.get('roleRevision') or None)!=(role.get('revision') or None):raise ValueError('Role changed')
  if not isinstance(prompt,str) or not 2<=len(prompt.strip())<=1500 or not isinstance(depicts_self,bool):raise ValueError('Invalid drawing prompt')
  identity=hashlib.sha256(job['id'].encode()).hexdigest()[:24];now=time.time()
  with self.db:
   old=self.db.execute('SELECT * FROM drawings WHERE id=?',(identity,)).fetchone()
   if old:
    if old['prompt']!=prompt.strip() or bool(old['depicts_self'])!=depicts_self:raise ValueError('This turn already submitted a different drawing; do not duplicate')
    return dict(old)
   if self.db.execute("SELECT 1 FROM drawings WHERE state IN ('queued','generating','ready','sending')").fetchone():raise ValueError('A drawing is already pending; query its status')
   self.db.execute('INSERT INTO drawings VALUES(?,?,?,?,?,?,?,?,?,?,?)',(identity,job['id'],job['avatar'],job.get('roleRevision'),prompt.strip(),int(depicts_self),'queued','','',now,now))
  return dict(self.db.execute('SELECT * FROM drawings WHERE id=?',(identity,)).fetchone())
 def claim(self,role):
  for row in self.db.execute("SELECT * FROM drawings WHERE state IN ('queued','ready') ORDER BY created").fetchall():
   if not same_role(row,role):self.finish(row['id'],'cancelled',error='Selected character changed');continue
   if row['state']=='queued':
    with self.db:
     changed=self.db.execute("UPDATE drawings SET state='generating',updated=? WHERE id=? AND state='queued'",(time.time(),row['id'])).rowcount
    if not changed:continue
   return dict(row)
 def finish(self,identity,state,path=None,error=''):
  with self.db:self.db.execute('UPDATE drawings SET state=?,path=COALESCE(?,path),error=?,updated=? WHERE id=?',(state,path,error[:500],time.time(),identity))
 def status(self,role):
  return [dict(r) for r in self.db.execute('SELECT id,state,prompt,path,error,updated FROM drawings WHERE avatar=? AND revision IS ? ORDER BY created DESC LIMIT 3',(role['avatar'],role.get('revision')))]

if __name__=='__main__':
 request=json.loads(sys.argv[1]);jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'));job=jobs[request['job_id']]
 role=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'))['roles']['private'];store=Drawings()
 if not action_turn(job) or job.get('scope')!='private' or job.get('avatar')!=role.get('avatar') or (job.get('roleRevision') or None)!=(role.get('revision') or None):raise ValueError('No current authorized owner drawing tool request')
 result=store.submit(job,role,request['prompt'],request.get('depicts_self',False)) if request['operation']=='submit' else store.status(role) if request['operation']=='status' else None
 if result is None:raise ValueError('Unknown drawing operation')
 print(json.dumps({'result':result,'user_seen':False,'note':'queued/generating/ready are not delivery; native_accepted is client acceptance only'},ensure_ascii=False));store.db.close()
