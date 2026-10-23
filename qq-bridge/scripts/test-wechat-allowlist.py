import json,tempfile
from pathlib import Path
from wechat_allowlist import allowed,accepted,remember_candidate,ACCOUNT,OWNER
with tempfile.TemporaryDirectory() as tmp:
    f=Path(tmp)/'config.json';peer='wxid_example'
    f.write_text(json.dumps({'enabled':True,'contacts':{peer:{'enabled':True}}}))
    event={'self_wxid':ACCOUNT,'sender_id':peer,'chat_id':peer}
    assert allowed(peer,f) and accepted(event,f)
    assert not accepted({**event,'sender_id':OWNER},f)
    assert not accepted({**event,'room_wxid':'group@chatroom'},f)
    assert not accepted({**event,'self_wxid':'wrong'},f)
    f.write_text('{}');assert not accepted(event,f)
    f.write_text('broken');assert not allowed(peer,f)
    remember_candidate({**event,'msg':'must never persist','sender_wechat_name':'测试好友'},f)
    candidates=f.parent/'contact-candidates.json'
    assert candidates.exists() and 'must never persist' not in candidates.read_text(encoding='utf-8')
    remember_candidate({**event,'self_wxid':'wrong','chat_id':'wxid_wrong'},f)
    assert len(json.loads(candidates.read_text(encoding='utf-8'))['items'])==1
print('PASS native extra-contact gate: account/private/sender validation and hot revocation, fail closed')
