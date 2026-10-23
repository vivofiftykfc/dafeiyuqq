"""Restricted ST-to-native sticker actions. No arbitrary target or file path."""
import json,hashlib,time
from group_speech import SpeechSuppressed
from privacy_policy import ROOT,PRIVATE_PEER,GROUP_PEER

async def dispatch(request,jobs,send,inventory,selected):
    job=jobs.get(request.get('job_id'),{})
    from autonomy_policy import action_turn
    if not action_turn(job):
        return {'state':'rejected','reason':'not_active_real_chat'}
    if job.get('dshDeadline') and time.time()*1000 >= job['dshDeadline']:
        return {'state':'rejected','reason':'generation_expired'}
    target=PRIVATE_PEER if job.get('scope')=='private' else GROUP_PEER if job.get('scope')=='group' else None
    if not target or selected(target).get('avatar')!=job.get('avatar'):
        return {'state':'rejected','reason':'role_or_scope_changed'}
    item=next((x for x in inventory(target) if x['id']==request.get('item_id')),None)
    if not item:return {'state':'rejected','reason':'not_in_verified_inventory'}
    identity='sticker-tool:'+hashlib.sha256(job['id'].encode()).hexdigest()[:24]
    try:
        accepted=await send(target,ROOT/item['path'],identity)
        return {'state':'native_accepted' if accepted else 'uncertain','item_id':item['id'],'caption':item['caption'],'user_seen':False}
    except SpeechSuppressed as error:
        return {'state':'rejected','item_id':item['id'],'reason':str(error),'native_send_attempted':False}
    except Exception:
        return {'state':'uncertain','item_id':item['id'],'reason':'native_result_unknown_do_not_retry'}

async def drain(send,inventory,selected):
    folder=ROOT/'runtime/sticker-actions'
    if not folder.exists():return
    jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'))
    for path in list(folder.glob('*.request.json'))[:2]:
        claimed=path.with_name(path.name.replace('.request.json','.claimed.json'))
        path.replace(claimed)
        request=json.loads(claimed.read_text(encoding='utf-8'))
        result=await dispatch(request,jobs,send,inventory,selected)
        result['time']=time.time()
        destination=path.with_name(path.name.replace('.request.json','.result.json'))
        temp=destination.with_suffix('.tmp');temp.write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8');temp.replace(destination)
