"""Replay the user's explicitly requested failed write through the real broker."""
import json,uuid
import httpx
from privacy_policy import ROOT,PRIVATE_PEER
cfg=json.loads((ROOT/'runtime/owner-ops.json').read_text())
with httpx.Client(timeout=260,trust_env=False) as c:
    response=c.post('http://127.0.0.1:18004/execute',headers={'Authorization':'Bearer '+cfg['token']},json={'event_id':'repair-natural-write-'+uuid.uuid4().hex,'sender_id':PRIVATE_PEER,'chat_id':PRIVATE_PEER,'task':'请实际使用文件工具，在当前工作区 note/微信验收.md 里面写一句：主人权限已经接通。写完读取确认，回复执行结果。'})
    response.raise_for_status()
path=ROOT/'runtime/owner-actions/private/workspace/note/微信验收.md'
if not path.exists() or '主人权限已经接通' not in path.read_text(encoding='utf-8'):raise RuntimeError('Requested file not verified')
print('Verified:',path)
