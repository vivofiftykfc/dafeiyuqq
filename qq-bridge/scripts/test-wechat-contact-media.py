import io,json,sqlite3,sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'wechat/integration'))
import contact_scope,visual_preview,wechat_voice_inbox as voice
from PIL import Image
peer='wxid_example';other='wxid_example'
contact_scope.allowed=lambda p:p in (peer,other)
with tempfile.TemporaryDirectory() as tmp:
    visual_preview.ROOT=Path(tmp)
    raw=io.BytesIO();Image.new('RGB',(24,24),'blue').save(raw,format='PNG')
    event={'chat_id':peer,'sender_id':peer,'event_id':'image-fixture'}
    file=Path(visual_preview.save(raw.getvalue(),event,'fixture'))
    assert contact_scope.media_scope(peer) in file.as_posix()
    assert contact_scope.media_scope(peer)!=contact_scope.media_scope(other)
    assert json.loads(file.with_suffix('.json').read_text())['sender_id']==peer
    try:visual_preview.save(raw.getvalue(),{**event,'sender_id':other},'fixture');raise AssertionError('sender accepted')
    except ValueError:pass
    row={'peer':peer,'server_id':'123','id':'voice:'+peer+':123'}
    result=voice.message_event(row,'测试语音')
    assert result['chat_id']==peer and result['sender_id']==peer
    try:voice.message_event({**row,'id':'voice:123'},'bad');raise AssertionError('cross-peer id accepted')
    except ValueError:pass
    from unified_chat_memory import remember,key
    db=Path(tmp)/'memory.sqlite'
    remember('fixture-account',peer,'voice:123','in',result['msg'],peer,file=db)
    with sqlite3.connect(db) as c:
        assert c.execute('select k,sender,text from social_pending').fetchone()==(key('fixture-account',peer),peer,'测试语音')
        assert c.execute('select count(*) from continuity_pending').fetchone()[0]==1
    c.close()
    contact_scope.allowed=lambda p:False
    try:voice.message_event(row,'revoked');raise AssertionError('disabled accepted')
    except ValueError:pass
print('PASS contact image source/scope, voice peer identity/revocation, memory/social/continuity ingestion; no live messages')
