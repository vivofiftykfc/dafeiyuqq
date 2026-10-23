"""Exact message-hash -> packed attachment mapping for the bound alt account.

Uses the existing local DB reader without any process enumeration or key scanning.
Only image rows in the two authorized conversations are queried.
"""
import hashlib
import importlib.util
import io
import json
import re
import threading
import xml.etree.ElementTree as ET
from pathlib import Path
from privacy_policy import ROOT,PRIVATE_PEER,GROUP_PEER

ACCOUNT=Path('__WECHAT_DATA_ROOT__/wxid_example')
_lock=threading.Lock()
_reader=None

def message_attachment(content,packed,expected):
    if isinstance(content,bytes):
        if content.startswith(b'\x28\xb5\x2f\xfd'):
            import zstandard
            with zstandard.ZstdDecompressor(max_window_size=1024).stream_reader(io.BytesIO(content)) as stream:
                raw=stream.read(1024*1024+1)
            if len(raw)>1024*1024:raise ValueError('Message too large')
            content=raw.decode('utf-8')
        else:content=content.decode('utf-8',errors='strict')
    if not isinstance(content,str) or '<!DOCTYPE' in content.upper() or '<!ENTITY' in content.upper():return None
    start=content.find('<msg');end=content.rfind('</msg>')
    if start<0 or end<0:return None
    try:image=ET.fromstring(content[start:end+6]).find('img')
    except ET.ParseError:return None
    if image is None:return None
    hashes={image.get('md5','').lower(),image.get('originsourcemd5','').lower()}-{''}
    if not hashes.intersection(expected):return None
    if isinstance(packed,str):packed=packed.encode()
    if not isinstance(packed,bytes):return None
    names=set(x.decode().lower() for x in re.findall(rb'(?<![0-9a-fA-F])[0-9a-fA-F]{32}(?![0-9a-fA-F])',packed))
    return next(iter(names)) if len(names)==1 else None

def reader():
    global _reader
    if _reader is not None:return _reader
    spec=importlib.util.spec_from_file_location('bound_image_db_reader',ROOT/'vendor/wechatapi/wechatauto/db.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    class CachedReader(module.WeChatDB):
        def _collect_db_files(self):
            storage=Path(self.account_dir)/'db_storage'
            return [(p.relative_to(storage).as_posix(),str(p),p.stat().st_size) for p in sorted((storage/'message').glob('message_[0-9]*.db'))]
        def _find_weixin_pids(self):raise RuntimeError('Image reader cannot access processes')
        def _auto_diagnose_key_failure(self,rel):raise FileNotFoundError('Image metadata key requires bound worker')
        def _load_or_extract_keys(self,master_key=None):
            saved=json.loads(Path(self.keys_file).read_text(encoding='utf-8'))
            self._keys={rel:bytes.fromhex(saved[rel]) for rel,_,_ in self._db_files if rel in saved}
            self.unkeyed=[rel for rel,_,_ in self._db_files if not self._key_works(rel)]
            if self.unkeyed:raise FileNotFoundError('Image metadata keys unavailable')
    _reader=CachedReader(db_dir=str(ACCOUNT.parent),account=ACCOUNT.name,
        keys_file=str(ROOT/'local/image-hardlink-key.json'),workdir=str(ROOT/'runtime/image-index'))
    return _reader

def metadata_paths(event,expected):
    target=event['chat_id']
    from contact_scope import media_scope
    media_scope(target,event['sender_id'])
    if target==PRIVATE_PEER and event['sender_id']!=PRIVATE_PEER:raise ValueError('Private sender mismatch')
    table='Msg_'+hashlib.md5(target.encode()).hexdigest();names=set()
    with _lock:
        db=reader()
        for rel,_,_ in db._db_files:
            connection=db._open(rel)
            try:
                if not connection.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone():continue
                rows=connection.execute('SELECT message_content,packed_info_data FROM '+table+' WHERE (local_type & 255)=3 ORDER BY create_time DESC LIMIT 500')
                for content,packed in rows:
                    try:name=message_attachment(content,packed,expected)
                    except (ValueError,UnicodeError):continue
                    if name:names.add(name)
            finally:connection.close()
    folder=ACCOUNT/'msg/attach'/hashlib.md5(target.encode()).hexdigest();result=[]
    for name in sorted(names):
        for suffix in ('_h.dat','.dat','_t.dat'):
            for path in folder.glob('*/Img/'+name+suffix):
                if path.resolve().is_relative_to(folder.resolve()):result.append(path)
    return result
