"""Read-only public content admission, independent of generation backend."""
import time

def admitted(job,config,now=None):
    now=time.time()*1000 if now is None else now
    if job.get('state')!='running' or job.get('scope') not in ('private','group') or job.get('engine') not in ('dsh','tavern'):
        return False
    kind=job.get('kind','')
    if not (kind=='chat' or kind.startswith('runtime:')):return False
    role=config.get('roles',{}).get(job['scope'],{})
    if role.get('avatar')!=job.get('avatar') or role.get('revision')!=job.get('roleRevision'):return False
    deadline=job.get('dshDeadline') or (job.get('started',job.get('created',0))+110000)
    if deadline<=now:return False
    if job.get('evaluation'):return True
    return (job.get('chatFile')==(role.get('chatFile') or 'wechat-'+job['scope'])
        and ((kind=='chat' and job.get('requireReceipt') is True and job.get('id','').startswith('wechat:'))
             or (kind.startswith('runtime:') and job.get('id','').startswith('runtime:'))))
