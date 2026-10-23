"""Configure only the local MaiBot transport and character correction policy."""
import hashlib, json, secrets, shutil, time
from pathlib import Path
import tomlkit
ROOT=Path(__file__).resolve().parents[1]
if (ROOT/'runtime/isolation.json').exists():
    raise SystemExit('Per-conversation isolation is active; refusing the retired shared-instance configuration')
path=ROOT/'runtime/instance/config/bot_config.toml'
backup=ROOT/'runtime/config-history'/str(int(time.time()))
backup.mkdir(parents=True,exist_ok=True)
shutil.copy2(path,backup/path.name)
doc=tomlkit.parse(path.read_text(encoding='utf-8'))
doc['bot']['platforms']=['dafeiyu-wechat:wxid_bot','transport-check:synthetic-bot']
transport=ROOT/'runtime/wechat-transport.json'
cfg=json.loads(transport.read_text()) if transport.exists() else {'url':'ws://127.0.0.1:18000/ws','token':secrets.token_urlsafe(32)}
section=doc['maim_message']
section['enabled']=True
section['ws_server_host']='127.0.0.1'
section['ws_server_port']=18000
section['auth_token']=[cfg['token']]
section['enable_api_server']=False
policy='角色设定与真实共同经历分开：没有记忆依据的经历不要编造。用户明确纠正称呼、语气或回复习惯时，以最新明确纠正为准，将其作为长期偏好记住；不要把临时情绪推断成固定人格。群聊不得引用私聊的共同经历。'
if policy not in doc['personality']['personality']:
    doc['personality']['personality']=str(doc['personality']['personality'])+' '+policy
path.write_text(tomlkit.dumps(doc),encoding='utf-8')
transport.write_text(json.dumps(cfg),encoding='utf-8')
manifest={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'vendor/helper-source/native/build_text/text_bridge.dll',ROOT/'vendor/helper-source/native/build/selftest_bridge.dll']}
(ROOT/'runtime/native-build-sha256.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Local authenticated transport configured; previous configuration backed up. No credentials printed.')
