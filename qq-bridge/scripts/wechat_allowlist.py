"""Hot-read the operator's extra private-chat whitelist, without owner privileges."""
import json,re,time
from pathlib import Path
CONFIG=Path(__file__).resolve().parents[1]/'state/wechat-core/config.json'
ACCOUNT='wxid_bot'
OWNER='wxid_owner'

def allowed(peer,config=CONFIG):
    if not isinstance(peer,str) or not re.fullmatch(r'wxid_[A-Za-z0-9_-]{3,80}',peer) or peer in (ACCOUNT,OWNER):return False
    try:
        value=json.loads(config.read_text(encoding='utf-8-sig'))
        return value.get('enabled') is True and value.get('contacts',{}).get(peer,{}).get('enabled') is True
    except (OSError,ValueError,AttributeError):return False

def accepted(event,config=CONFIG):
    return event.get('self_wxid')==ACCOUNT and not event.get('is_self') and not event.get('room_wxid') and event.get('sender_id')==event.get('chat_id') and allowed(event.get('chat_id'),config)

def remember_candidate(event,config=CONFIG):
    peer=event.get('chat_id')
    if event.get('self_wxid')!=ACCOUNT or event.get('is_self') or event.get('room_wxid') or event.get('sender_id')!=peer:return
    if not isinstance(peer,str) or not re.fullmatch(r'wxid_[A-Za-z0-9_-]{3,80}',peer) or peer in (ACCOUNT,OWNER):return
    file=config.parent/'contact-candidates.json'
    try:
        value=json.loads(file.read_text(encoding='utf-8')) if file.exists() else {'account':ACCOUNT,'items':[]}
        if value.get('account')!=ACCOUNT:return
        if any(x.get('peer')==peer for x in value['items']):return
        value['items']=([{'peer':peer,'label':str(event.get('sender_wechat_name') or peer)[:80],'at':int(time.time()*1000)}]+value['items'])[:100]
        file.parent.mkdir(parents=True,exist_ok=True);tmp=file.with_suffix('.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False),encoding='utf-8');tmp.replace(file)
    except (OSError,ValueError,KeyError,TypeError):pass
