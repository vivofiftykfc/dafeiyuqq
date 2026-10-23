"""Exact source lookup for native WeChat videos in the two bound conversations."""
import hashlib,io,re,time,xml.etree.ElementTree as ET
from pathlib import Path
from privacy_policy import ROOT,PRIVATE_PEER,GROUP_PEER
from image_attachment_index import ACCOUNT,reader
SELF='wxid_bot'

def select_request(event):
    text=event.get('msg','');ref=event.get('reference') or {}
    common={'chat_id':event['chat_id'],'sender_id':event['sender_id'],'as_of':event.get('arrival_time',time.time())}
    if str(ref.get('type'))=='43':return {**common,'server_id':ref.get('server_id',''),'video_sender':ref.get('sender','')}
    if not re.search(r'视频',text) or not re.search(r'最新|刚才|刚发|这个|这段',text):return None
    mentioned=[user for user in event.get('at_members',[]) if user!=SELF]
    if len(mentioned)==1:return {**common,'video_sender':mentioned[0]}
    if event['chat_id']==PRIVATE_PEER and not mentioned:return {**common,'video_sender':PRIVATE_PEER}
    return None

def decode(content):
    if isinstance(content,bytes):
        if content.startswith(b'\x28\xb5\x2f\xfd'):
            import zstandard
            with zstandard.ZstdDecompressor(max_window_size=1024).stream_reader(io.BytesIO(content)) as f:content=f.read(1024*1024+1)
        if len(content)>1024*1024:raise ValueError('Video metadata exceeds limit')
        content=content.decode('utf-8')
    if not isinstance(content,str) or '<!DOCTYPE' in content.upper() or '<!ENTITY' in content.upper():raise ValueError('Invalid video XML')
    return content

def resolve(chat_id,sender_id,video_sender,as_of,server_id=None,db=None):
    if chat_id not in (PRIVATE_PEER,GROUP_PEER) or not sender_id:raise ValueError('Unknown video conversation')
    if chat_id==PRIVATE_PEER and (sender_id!=PRIVATE_PEER or video_sender!=PRIVATE_PEER):raise ValueError('Private video sender mismatch')
    if not re.fullmatch(r'[a-zA-Z0-9_.-]{1,128}',video_sender):raise ValueError('Explicit original sender required')
    if not isinstance(as_of,(int,float)) or not 0<as_of<=time.time()+30:raise ValueError('Invalid video source time')
    if server_id is not None and (not isinstance(server_id,str) or not re.fullmatch(r'[0-9]{1,20}',server_id)):raise ValueError('Exact video server ID required')
    db=db or reader();table='Msg_'+hashlib.md5(chat_id.encode()).hexdigest();found=[]
    for rel,_,_ in db._db_files:
        c=db._open(rel)
        try:
            if not c.execute('SELECT 1 FROM sqlite_master WHERE name=?',(table,)).fetchone():continue
            where=' AND m.server_id=?' if server_id is not None else ' AND m.create_time>=?'
            rows=c.execute('SELECT m.local_id,m.server_id,m.create_time,m.sort_seq,m.message_content,m.packed_info_data,n.user_name FROM '+table+' m JOIN Name2Id n ON n.rowid=m.real_sender_id WHERE (m.local_type&255)=43 AND n.user_name=? AND m.create_time<=?'+where+' ORDER BY m.create_time DESC,m.sort_seq DESC LIMIT 4',(video_sender,as_of,server_id if server_id is not None else as_of-1800)).fetchall()
            for row in rows:found.append(dict(row,shard=rel))
        finally:c.close()
    if not found:return {'status':'video_source_unavailable','message':'明确指向的视频记录暂未在绑定会话索引中找到；不是缺少网页链接','chat_id':chat_id,'video_sender':video_sender,'server_id':server_id}
    found.sort(key=lambda row:(row['create_time'],row['sort_seq']),reverse=True)
    top=found[0];same=[row for row in found if server_id is not None or (row['create_time'],row['sort_seq'])==(top['create_time'],top['sort_seq'])]
    signatures={(str(row['server_id']),hashlib.sha256(decode(row['message_content']).encode()).hexdigest(),bytes(row['packed_info_data'] or b'')) for row in same}
    if len(signatures)!=1:raise ValueError('Ambiguous native video source')
    xml=decode(top['message_content']);node=ET.fromstring(xml[xml.index('<'):]).find('videomsg')
    if node is None:raise ValueError('Missing native video metadata')
    if node.get('fromusername') and node.get('fromusername')!=video_sender:raise ValueError('Video XML sender mismatch')
    expected=node.get('md5','').lower()
    if not re.fullmatch(r'[0-9a-f]{32}',expected):raise ValueError('Video content MD5 required')
    packed=bytes(top['packed_info_data'] or b'');ids={m.decode().lower() for m in re.findall(rb'(?<![0-9a-fA-F])[0-9a-fA-F]{32}(?![0-9a-fA-F])',packed)}
    if len(ids)!=1:raise ValueError('Unique packed video cache ID required')
    cache_id=next(iter(ids));base=(ACCOUNT/'msg/video').resolve();candidates=[]
    for path in base.glob('*/'+cache_id+'.mp4'):
        resolved=path.resolve()
        if not resolved.is_relative_to(base) or not resolved.is_file() or not 12<resolved.stat().st_size<=64*1024*1024:continue
        raw=resolved.read_bytes()
        if raw[4:8]!=b'ftyp' or hashlib.md5(raw).hexdigest()!=expected:continue
        candidates.append((resolved,raw))
    source={'chat_id':chat_id,'video_sender':video_sender,'server_id':str(top['server_id']),'created':top['create_time'],'declared_seconds':node.get('playlength'),'selection':'exact_server_id_and_sender' if server_id is not None else 'latest_actual_mentioned_sender_before_request'}
    if not candidates:return {**source,'status':'video_identified_not_downloaded','message':'已收到并准确定位这条微信视频，但完整文件尚未下载到小号缓存；不是空引用或缺网页链接','requires_native_download':True}
    if len({hashlib.sha256(raw).hexdigest() for _,raw in candidates})!=1:raise ValueError('Conflicting cached native video files')
    path,raw=candidates[0]
    return {**source,'status':'local_video_verified','path':str(path),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'md5_verified':True}
