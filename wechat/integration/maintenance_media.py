"""Explicit local owner-authorized group acceptance; never an invented inbound chat."""
import hashlib,json,re,time
from privacy_policy import ROOT,GROUP_PEER,PRIVATE_PEER
from media_actions import approved_media

async def drain(send,gate,lease,last_result):
    request=ROOT/'runtime/group-file-acceptance.request.json'
    if not request.exists():return
    claimed=request.with_name('group-file-acceptance.claimed-'+str(time.time_ns())+'.json')
    request.replace(claimed)
    report={'sent_by':'explicit_owner_authorized_maintenance','user_seen':False}
    identity=None
    try:
        row=json.loads(claimed.read_text(encoding='utf-8'))
        if row.get('purpose')!='owner_requested_group_file_acceptance' or row.get('target')!=GROUP_PEER or not re.fullmatch(r'[a-zA-Z0-9-]{1,80}',row.get('id','')):raise ValueError('Invalid acceptance request')
        if not 0<=time.time()-row.get('created',0)<=300:raise ValueError('Expired acceptance request')
        path,kind=approved_media(GROUP_PEER,ROOT/row['path'])
        if kind not in ('image','video') or not path.name.startswith('group-file-acceptance-'):raise ValueError('Only labeled image/video fixtures accepted')
        if hashlib.sha256(path.read_bytes()).hexdigest()!=row['sha256']:raise ValueError('Fixture changed')
        identity='maintenance-file:'+row['id']
        # This claim records a maintenance operation, not a fake WeChat user turn.
        gate.claims[identity]={'active':True,'started':time.time(),'mode':'direct','peer':PRIVATE_PEER,'reason':'owner_authorized_maintenance'}
        lease[GROUP_PEER]=time.monotonic()+60
        report.update(id=row['id'],path=row['path'],sha256=row['sha256'],kind=kind)
        ok=await send(GROUP_PEER,path,identity)
        report.update(state='native_accepted' if ok else 'uncertain',native_result=last_result())
    except Exception as error:
        report.update(state='failed_or_uncertain',error=type(error).__name__+': '+str(error),native_result=last_result())
    finally:
        if identity:gate.finish(identity)
    report['time']=time.time()
    result=claimed.with_name(claimed.name.replace('.claimed-','.result-'))
    result.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
