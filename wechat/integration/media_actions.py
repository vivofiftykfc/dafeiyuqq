"""Conversation-scoped media inventory and durable, one-send-per-turn dispatch."""
import hashlib,json,time,sys
from pathlib import Path
from privacy_policy import ROOT,PRIVATE_PEER,GROUP_PEER
from group_speech import SpeechSuppressed

def active(job,selected):
    from autonomy_policy import action_turn
    if not action_turn(job):
        raise ValueError('not_active_real_chat')
    if job.get('dshDeadline') and time.time()*1000>=job['dshDeadline']:raise ValueError('generation_expired')
    target={'private':PRIVATE_PEER,'group':GROUP_PEER}.get(job.get('scope'))
    if not target:raise ValueError('unknown_scope')
    role=selected(target)
    if role.get('avatar')!=job.get('avatar') or (role.get('revision') or None)!=(job.get('roleRevision') or None):raise ValueError('role_changed')
    return target

def approved_media(target,path):
    scope={PRIVATE_PEER:'private',GROUP_PEER:'group'}.get(target)
    if not scope:raise ValueError('unknown_destination')
    p=Path(path).resolve(strict=True)
    folders=[(ROOT/'runtime/media'/scope/'generated').resolve()]
    from voice_paths import VOICE_ROOT
    folders.append((VOICE_ROOT/'audio'/scope).resolve())
    if not any(p.is_relative_to(folder) for folder in folders):raise ValueError('cross_conversation_media')
    if not p.is_file() or not 0<p.stat().st_size<=50*1024*1024:raise ValueError('invalid_media_size')
    with p.open('rb') as f:head=f.read(32)
    ext=p.suffix.lower();kind=None
    if ext=='.wav' and head[:4]==b'RIFF' and head[8:12]==b'WAVE':kind='audio'
    elif ext=='.mp3' and (head[:3]==b'ID3' or len(head)>1 and head[0]==255 and head[1]&224==224):kind='audio'
    elif ext=='.mp4' and head[4:8]==b'ftyp':kind='video'
    elif ext=='.webm' and head[:4]==b'\x1aE\xdf\xa3':kind='video'
    elif ext in ('.png','.jpg','.jpeg','.gif','.webp'):
        from image_policy import approved_image
        approved_image(target,p);kind='image'
    if not kind:raise ValueError('unsupported_media_signature')
    return p,kind

def describe_media(target,path):
    p,kind=approved_media(target,path)
    scope='private' if target==PRIVATE_PEER else 'group'
    digest=hashlib.sha256(p.read_bytes()).hexdigest()
    identity=hashlib.sha256((scope+'\0'+str(p)+'\0'+digest).encode()).hexdigest()
    return {'id':identity,'name':p.name,'kind':kind,'bytes':p.stat().st_size,'path':str(p),'sha256':digest}

def inventory(target):
    scope={PRIVATE_PEER:'private',GROUP_PEER:'group'}.get(target)
    if not scope:raise ValueError('unknown_destination')
    folders=[ROOT/'runtime/media'/scope/'generated']
    from voice_paths import VOICE_ROOT
    folders.append(VOICE_ROOT/'audio'/scope)
    result=[]
    paths=sorted((p for folder in folders if folder.exists() for p in folder.iterdir() if p.is_file()),key=lambda p:p.stat().st_mtime,reverse=True)[:100]
    for candidate in paths:
        try:
            result.append(describe_media(target,candidate))
        except (ValueError,OSError):continue
    return result

async def dispatch(request,jobs,send,selected):
    try:
        job=jobs.get(request.get('job_id'),{});target=active(job,selected)
        item=next((x for x in inventory(target) if x['id']==request.get('item_id')),None)
        if not item:raise ValueError('not_in_current_scope_inventory')
    except ValueError as e:return {'state':'rejected','reason':str(e),'native_send_attempted':False}
    identity='media-tool:'+hashlib.sha256(job['id'].encode()).hexdigest()[:24]
    try:
        accepted=await send(target,Path(item['path']),identity)
        return {'state':'native_accepted' if accepted else 'uncertain','item_id':item['id'],'kind':item['kind'],'user_seen':False,'native_voice_bubble':False}
    except SpeechSuppressed as e:return {'state':'rejected','reason':str(e),'native_send_attempted':False}
    except Exception:return {'state':'uncertain','reason':'native_result_unknown_do_not_retry'}

async def drain(send,selected):
    folder=ROOT/'runtime/media-actions'
    if not folder.exists():return
    jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'))
    for path in list(folder.glob('*.request.json'))[:2]:
        claimed=path.with_name(path.name.replace('.request.json','.claimed.json'));path.replace(claimed)
        result=await dispatch(json.loads(claimed.read_text(encoding='utf-8')),jobs,send,selected)
        result['time']=time.time()
        destination=path.with_name(path.name.replace('.request.json','.result.json'))
        temp=destination.with_suffix('.tmp');temp.write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8');temp.replace(destination)

if __name__=='__main__':
    from role_state import selected
    request=json.loads(sys.argv[1]);jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'))
    target=active(jobs.get(request.get('job_id'),{}),selected)
    print(json.dumps({'items':[{k:v for k,v in item.items() if k not in ('path','sha256')} for item in inventory(target)],'scope':'group' if target==GROUP_PEER else 'private'},ensure_ascii=False))
