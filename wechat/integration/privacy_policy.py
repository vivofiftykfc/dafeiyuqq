"""Fail-closed application-level boundaries, independent of model instructions."""
import json,tomllib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PRIVATE_PEER='wxid_owner'
GROUP_PEER='10000000@chatroom'

def validate_isolation(root=ROOT):
    manifest=json.loads((root/'runtime/isolation.json').read_text(encoding='utf-8'))
    endpoints=manifest['conversations']
    expected={'private':('private-owner',PRIVATE_PEER,18001),'group':('group-work',GROUP_PEER,18011)}
    for kind,(slug,peer,port) in expected.items():
        entry=endpoints[kind]
        path=Path(entry['instance']).resolve()
        if path!=(root/'runtime/isolated'/slug).resolve() or entry['peer']!=peer or entry['web_port']!=port:
            raise RuntimeError('Conversation identity or instance path changed')
        doc=tomllib.loads((path/'config/bot_config.toml').read_text(encoding='utf-8'))
        if doc['mcp']['servers'] or doc['agent']['enabled'] or doc['plugin_runtime']['enabled']:
            raise RuntimeError('Shared tools/plugins are forbidden in isolated conversations')
        if doc['a_memorix']['global_memory_sharing_enabled'] or doc['a_memorix']['shared_memory_groups']:
            raise RuntimeError('Cross-conversation memory sharing is forbidden')
        if doc['a_memorix']['storage']['data_dir']!='data/a-memorix':
            raise RuntimeError('Memory path must remain inside its own instance')
    transport=json.loads((root/'runtime/wechat-transport.json').read_text())
    if transport['url']!='ws://127.0.0.1:18010/ws':raise RuntimeError('Group endpoint must be the isolated group runtime')
    return manifest

def authorized_event(data):
    if data.get('self_wxid')!='wxid_bot' or data.get('is_self'):return False
    if data.get('room_wxid'):
        return data.get('room_wxid')==GROUP_PEER and data.get('chat_id')==GROUP_PEER and bool(data.get('sender_id'))
    return data.get('chat_id')==PRIVATE_PEER and data.get('sender_id')==PRIVATE_PEER
