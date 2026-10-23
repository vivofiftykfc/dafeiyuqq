"""Immutable event-addressed image preview for scoped, transient multimodal chat."""
import hashlib,json
from privacy_policy import ROOT,PRIVATE_PEER,GROUP_PEER
from media_core import image_bytes

def save(raw,event,detail):
    target=event['chat_id']
    from contact_scope import media_scope
    media_scope(target,event['sender_id'])
    if target==PRIVATE_PEER and event['sender_id']!=PRIVATE_PEER:raise ValueError('Wrong private sender')
    scope=media_scope(target,event['sender_id'])
    folder=ROOT/'runtime/media'/scope/'incoming';folder.mkdir(parents=True,exist_ok=True)
    path=folder/(hashlib.sha256(event['event_id'].encode()).hexdigest()+'.vision.jpg')
    from image_animation import inspect
    animation,frames=inspect(raw,samples=True)
    raw=image_bytes(raw);digest=hashlib.sha256(raw).hexdigest()
    metadata={'event_id':event['event_id'],'chat_id':target,'sender_id':event['sender_id'],'detail':detail,'sha256':digest}
    if path.exists():
        if hashlib.sha256(path.read_bytes()).hexdigest()!=digest:raise ValueError('Event image changed')
    else:
        temp=path.with_suffix('.tmp');temp.write_bytes(raw);temp.replace(path)
    metadata['image_media']=animation
    metadata['samples']=[]
    for index,frame in enumerate(frames):
        sample=path.with_name(path.stem+'.sample-'+str(index)+'.jpg')
        body=frame['jpeg'];checksum=hashlib.sha256(body).hexdigest()
        if sample.exists() and hashlib.sha256(sample.read_bytes()).hexdigest()!=checksum:raise ValueError('Event frame changed')
        sample.write_bytes(body)
        metadata['samples'].append({'file':sample.name,'sha256':checksum,'frame':frame['frame'],'time_ms':frame['time_ms']})
    temp=path.with_suffix('.json.tmp');temp.write_text(json.dumps(metadata),encoding='utf-8');temp.replace(path.with_suffix('.json'))
    return str(path)
