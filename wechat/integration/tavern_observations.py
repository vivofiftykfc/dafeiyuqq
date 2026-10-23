"""Durable records of actual outgoing events; never resends a WeChat message."""
import hashlib
import json
import os
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def record(target, event_id, text, *, media=False, root=ROOT):
    from role_state import selected
    role = selected(target)
    scope = 'private' if target == 'wxid_owner' else 'group'
    identity = 'observation:' + hashlib.sha256(event_id.encode()).hexdigest()[:32]
    folder = root / 'runtime/tavern-observations'
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / (identity.replace(':', '-') + '.json')
    if path.exists():
        return identity
    row = dict(id=identity, source=event_id, text=text, scope=scope,
               avatar=role['avatar'], character=role['name'],
               chatFile=role.get('chatFile') or 'wechat-' + scope,
               media=media, created=int(time.time()*1000), state='pending')
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(row, ensure_ascii=False), encoding='utf-8')
    os.replace(temporary, path)
    return identity
