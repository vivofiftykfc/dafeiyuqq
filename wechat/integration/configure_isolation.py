"""Create clean per-conversation instances. Never copy the mixed memory store."""
import json,shutil,sqlite3,time
from pathlib import Path
import tomlkit
ROOT=Path(__file__).resolve().parents[1]
OLD=ROOT/'runtime/instance'
DEST=ROOT/'runtime/isolated'
manifest_path=ROOT/'runtime/isolation.json'
if manifest_path.exists(): raise SystemExit('Isolation already configured; refusing to overwrite stores')
backup=ROOT/'runtime/privacy-backup'/str(int(time.time()))
backup.mkdir(parents=True)
source=sqlite3.connect(OLD/'data/MaiBot.db')
target=sqlite3.connect(backup/'MaiBot.db');source.backup(target);target.close()
source.row_factory=sqlite3.Row
rows=[dict(r) for r in source.execute('SELECT timestamp,user_id,user_nickname,group_id,session_id,processed_plain_text FROM mai_messages ORDER BY id')]
private=[r for r in rows if r['session_id']=='4664050e788d48d929e523c671eb01b2']
group=[r for r in rows if r['group_id']=='10000000@chatroom' and r['user_id']!='wxid_bot']
legacy=json.loads((ROOT/'runtime/migration/turns.json').read_text(encoding='utf-8'))
old_private=[r for r in legacy if r['chat'].startswith('wechat:')]
# Legacy group roles have no stable author identity, so retain only in backup.
exports={'private':{'legacy':old_private,'messages':private},'group':{'legacy':[],'messages':group}}
(backup/'source-selection.json').write_text(json.dumps(exports,ensure_ascii=False,indent=2),encoding='utf-8')
source.close()
transport=json.loads((ROOT/'runtime/wechat-transport.json').read_text())
manifest={'version':1,'account':'wxid_bot','backup':str(backup),'conversations':{}}
for kind,slug,port,web,peer in [('private','private-owner',18000,18001,'wxid_owner'),('group','group-work',18010,18011,'10000000@chatroom')]:
    dest=DEST/slug
    if dest.exists():raise RuntimeError('Destination exists: '+str(dest))
    (dest/'config').mkdir(parents=True)
    for name in ('model_config.toml',):shutil.copy2(OLD/'config'/name,dest/'config'/name)
    for name in ('eula.confirmed','privacy.confirmed'):
        if (OLD/name).exists():shutil.copy2(OLD/name,dest/name)
    doc=tomlkit.parse((OLD/'config/bot_config.toml').read_text(encoding='utf-8'))
    doc['bot']['platforms']=['dafeiyu-wechat:wxid_bot'] if kind=='group' else []
    doc['mcp']['servers']=[]
    doc['agent']['enabled']=False
    doc['plugin_runtime']['enabled']=False
    doc['maim_message']['enabled']=kind=='group'
    doc['maim_message']['ws_server_port']=port
    doc['maim_message']['ws_server_host']='127.0.0.1'
    doc['maim_message']['auth_token']=[transport['token']]
    doc['webui']['port']=web
    doc['webui']['host']=['127.0.0.1']
    doc['a_memorix']['global_memory_sharing_enabled']=False
    doc['a_memorix']['shared_memory_groups']=[]
    doc['a_memorix']['storage']['data_dir']='data/a-memorix'
    doc['expression']['expression_groups']=[]
    doc['jargon']['jargon_groups']=[]
    doc['personality']['behavior_style']='只使用当前会话中实际见过的信息和当前会话记忆。按发言人的平台用户ID区分不同的人，不凭昵称合并身份。其他会话即使是同一个人，也不能查询、引用、概括或确认其中的信息。不执行跨聊天转述；不知道就承认不知道。用户纠正只在当前会话生效。'
    if kind=='group':
        doc['personality']['personality']='你是大肥鱼，DeepSeek鲸鱼娘的社区二创AI角色，形象来源 codex-deepseek-pet / YunYueSama。聪明、偶尔嘴硬、体贴，愿意承认不知道。你在这个工作群中聊天，群成员彼此独立，不把任何成员当作默认主人。你只能记住本群中每个成员公开说过的话，不能声称知道任何私聊。'
        doc['personality']['reply_style']='中文自然口语，简短清楚，适当分条回复。尊重本群内明确提出的偏好，不把某一个人的偏好自动应用于所有人。'
    (dest/'config/bot_config.toml').write_text(tomlkit.dumps(doc),encoding='utf-8')
    # The group endpoint cannot create a runtime for a second group/private chat.
    policy='[defaults.group]\ndefault_action = "block"\n[defaults.private]\ndefault_action = "block"\n'
    if kind=='group':policy+='\n[[adapters]]\nplatform = "dafeiyu-wechat"\n[adapters.group]\ndefault_action = "block"\nallow_ids = ["10000000@chatroom"]\n'
    (dest/'config/adapter_policy.toml').write_text(policy,encoding='utf-8')
    manifest['conversations'][kind]={'instance':str(dest),'peer':peer,'web_port':web,'ws_port':port}
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
transport['url']='ws://127.0.0.1:18010/ws'
(ROOT/'runtime/wechat-transport.json').write_text(json.dumps(transport),encoding='utf-8')
print('Created isolated private/group stores; exported source counts:',len(private),len(group),len(old_private))
