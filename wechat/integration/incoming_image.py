"""Resolve only the bound account and conversation, then verify message MD5.

V2 format reference: hicccc77/WeFlow imageDecryptService.ts, CC BY-NC-SA 4.0.
No third-party binary is loaded. No nearest-file fallback is permitted.
"""
import hashlib,json,struct,xml.etree.ElementTree as ET
from pathlib import Path
from cryptography.hazmat.primitives.ciphers import Cipher,algorithms,modes
from privacy_policy import ROOT,PRIVATE_PEER,GROUP_PEER

ACCOUNT=Path(r'__WECHAT_DATA_ROOT__\wxid_example')

def decode(raw,key,xor):
    if raw[:6]!=b'\x07\x08V2\x08\x07':return raw
    aes_size,xor_size=struct.unpack_from('<II',raw,6)
    aligned=(aes_size//16+1)*16
    if aligned>len(raw)-15 or xor_size>len(raw)-15-aligned:raise ValueError('Invalid V2 length')
    dec=Cipher(algorithms.AES(key),modes.ECB()).decryptor()
    plain=dec.update(raw[15:15+aligned])+dec.finalize()
    pad=plain[-1]
    if not 1<=pad<=16 or plain[-pad:]!=bytes([pad])*pad:raise ValueError('Wrong image key')
    remainder=raw[15+aligned:]
    return plain[:-pad]+(remainder[:-xor_size]+bytes(x^xor for x in remainder[-xor_size:]) if xor_size else remainder)

def resolve(event):
    target=event['chat_id']
    from contact_scope import media_scope
    media_scope(target,event['sender_id'])
    if target==PRIVATE_PEER and event['sender_id']!=PRIVATE_PEER:raise ValueError('Sender mismatch')
    xml=event['xml'];xml=xml[xml.index('<'):]
    if '<!DOCTYPE' in xml.upper() or '<!ENTITY' in xml.upper():raise ValueError('XML entities forbidden')
    el=ET.fromstring(xml).find('img')
    if el is None:raise ValueError('No image metadata')
    hashes={el.get('md5','').lower(),el.get('originsourcemd5','').lower()}-{''}
    if not hashes or any(len(x)!=32 or any(c not in '0123456789abcdef' for c in x) for x in hashes):raise ValueError('Missing image identity')
    cfg=json.loads((ROOT/'local/image-cache-key.json').read_text())
    if cfg['account']!='wxid_bot' or not cfg['verified_against_own_image']:raise ValueError('Key binding mismatch')
    key=bytes.fromhex(cfg['key_hex'])
    sample=json.loads((ROOT/'runtime/image-key-sample.json').read_text())
    original=Path(sample['plain']).read_bytes();encrypted=Path(sample['encrypted']).read_bytes()
    xor=original[-1]^encrypted[-1]
    folder=ACCOUNT/'msg/attach'/hashlib.md5(target.encode()).hexdigest()
    # A thumbnail's bytes cannot match the original image MD5. Use the exact
    # message XML hash and that same row's packed file id to establish identity.
    try:
        from image_attachment_index import metadata_paths
        linked=metadata_paths(event,hashes)
    except (FileNotFoundError,ImportError,OSError):linked=[]
    for p in linked:
        if p.stat().st_size>16*1024*1024:continue
        try:
            raw=decode(p.read_bytes(),key,xor)
            if raw.startswith(b'wxgf'):continue
            from media_core import image_bytes
            from image_animation import incoming_bytes
            normalized,extension=incoming_bytes(raw)
        except ValueError:continue
        detail='message-linked-thumbnail' if p.stem.endswith('_t') else 'message-linked-original'
        scope=media_scope(target,event['sender_id'])
        dest=ROOT/'runtime/media'/scope/'incoming'/(hashlib.sha256(raw).hexdigest()+extension)
        dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(normalized)
        dest.with_suffix('.metadata.json').write_text(json.dumps({'detail':detail,'association':'exact-message-md5-and-packed-file-id','message_md5':el.get('md5'),'event_id':event['event_id'],'chat_id':target,'sender_id':event['sender_id']}),encoding='utf-8')
        return dest
    files=[p for p in folder.glob('*/Img/*.dat') if abs(p.stat().st_mtime-event['received'])<300]
    # WeChat deduplicates identical attachments across conversations. Reuse only
    # a previously verified blob explicitly named by THIS incoming message hash;
    # never reuse another conversation's visual description, sender or history.
    index_path=ROOT/'local/image-blob-index.json'
    index=json.loads(index_path.read_text()) if index_path.exists() else {}
    pinned={Path(index[h]).resolve() for h in hashes if h in index}
    files.extend(p for p in pinned if p.is_file() and p not in files)
    # Reused attachments can retain old mtimes and live under another chat.
    # Only byte-for-byte message hash matches may be reused, never its history.
    reused=set((ACCOUNT/'msg/attach').glob('*/*/Img/*.dat'))
    files.extend(p for p in reused if p not in files)
    for p in sorted(files,key=lambda x:x.stat().st_mtime,reverse=True):
        if not p.resolve().is_relative_to((ACCOUNT/'msg/attach').resolve()) or p.stat().st_size>16*1024*1024:continue
        # The exact decoded MD5 below is mandatory even for cross-directory blobs.
        try:raw=decode(p.read_bytes(),key,xor)
        except ValueError:continue
        if hashlib.md5(raw).hexdigest() not in hashes:continue
        index[hashlib.md5(raw).hexdigest()]=str(p.resolve())
        index_path.write_text(json.dumps(index),encoding='utf-8')
        from media_core import image_bytes
        detail='original'
        if raw.startswith(b'wxgf'):
            # Original MD5 already matched the live message. Its same-base
            # thumbnail is an authenticated association, not a recent-file guess.
            stem=p.stem.removesuffix('_h').removesuffix('_t')
            thumbnail=p.with_name(stem+'_t.dat')
            bubble=ACCOUNT/'cache'/p.parent.parent.name/'Message'/p.parent.parent.parent.name/'Bubble'/(stem+'_b.dat')
            if bubble.is_file() and bubble.stat().st_size<=16*1024*1024:
                raw=decode(bubble.read_bytes(),key,xor);detail='display-cache'
            elif thumbnail.is_file():
                raw=decode(thumbnail.read_bytes(),key,xor);detail='thumbnail'
            else:continue
        from image_animation import incoming_bytes
        normalized,extension=incoming_bytes(raw)
        scope=media_scope(target,event['sender_id'])
        dest=ROOT/'runtime/media'/scope/'incoming'/ (hashlib.sha256(raw).hexdigest()+extension)
        dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(normalized)
        dest.with_suffix('.metadata.json').write_text(json.dumps({'detail':detail,'message_md5':el.get('md5'),'event_id':event['event_id'],'chat_id':target,'sender_id':event['sender_id']}),encoding='utf-8')
        return dest
    raise FileNotFoundError('No decoded image matching this message MD5; never substitute a nearby image')
