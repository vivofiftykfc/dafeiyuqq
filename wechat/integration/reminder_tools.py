"""Source-bound DSH access to the existing owner-global durable reminder store."""
import datetime as dt,json,sys,time
from privacy_policy import ROOT
from reminders import Reminders

def dispatch(request,jobs,config,store):
 job=jobs[request['job_id']];role=config['roles']['private']
 if job.get('state')!='running' or job.get('evaluation') or job.get('scope')!='private' or job.get('kind')!='chat' or not job['id'].startswith('wechat:'):raise ValueError('Only real owner chat can access reminders')
 if job.get('avatar')!=role.get('avatar') or (job.get('roleRevision') or None)!=(role.get('revision') or None) or (job.get('dshDeadline') and time.time()*1000>=job['dshDeadline']):raise ValueError('Expired or changed role')
 operation=request['operation']
 if operation=='list':return {'items':store.listing(request.get('include_completed') is True),'scope':'owner-private-global','delivery_semantics':'sent means native client accepted, not read by user'}
 if operation=='get':return {'reminder':store.get(request['id'])}
 if operation=='cancel':return store.cancel(request['id'])
 if operation!='create':raise ValueError('Unknown reminder operation')
 when=dt.datetime.fromisoformat(request['when'].replace('Z','+00:00'))
 if when.tzinfo is None:raise ValueError('Reminder time requires explicit timezone offset')
 repeat={'none':0,'daily':86400,'weekly':604800}.get(request.get('repeat','none'))
 if repeat is None:raise ValueError('Invalid recurrence')
 row=store.create(request['text'],when.timestamp(),repeat,source_job=job['id'])
 return {'reminder':row,'sent':False,'note':'Persisted schedule, not an already delivered reminder. Delivery needs the small-account service online; overdue pending reminders catch up after restart; unknown sends do not replay.'}

if __name__=='__main__':
 request=json.loads(sys.argv[1]);jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'));config=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'));store=Reminders()
 try:print(json.dumps(dispatch(request,jobs,config,store),ensure_ascii=False))
 finally:store.db.close()
