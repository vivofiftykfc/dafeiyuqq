"""Restore dependency contract. Hash integrity alone cannot establish completeness."""
import json,re
from pathlib import Path

REQUIRED=(
 'local/autonomy.json','integration/autonomy_policy.py','integration/companion_wake.py','integration/daily_life.py',
 'integration/host_access.py',
 'integration/host_executor.py','integration/dsh_dispatch.py','integration/style_evolution.py','integration/probe_host_access.py',
 'integration/media_actions.py','integration/media_service.py','integration/dsh_vision.py',
 'integration/build-media-files-v5.cmd','vendor/helper-source/native/file_send.inc',
 'vendor/helper-source/native/media_bridge.cpp','vendor/helper-source/native/build_media_files_v5/text_bridge.dll',
 'runtime/native-build-sha256.json','prompts/whale-wechat-dsh.txt','prompts/whale-user-source.txt',
 'docs/HANDOFF-2026-10-23.md',

 'integration/wechat_bridge.py','integration/wechat_native_probe.py','integration/supervisor.py',
 'integration/local_backup.py','integration/backup_retention.py','integration/backup_schedule.py','integration/backup_worker.py','local/backup-retention.json',
 'integration/dsh_generate.py','integration/dsh_runtime.py','integration/dsh-wechat-context/index.mjs',
 'integration/dsh_model_policy.py','integration/conversation_planner.py','integration/context_projection.py',
 'integration/dsh_group_policy.py',
 'integration/reading_journal.py','integration/reply_pacing.py','integration/candidate_review.py',
 'integration/voice_storage.py','integration/wechat_voice_inbox.py',
 'integration/turn_arrivals.py','integration/image_context.py',
 'integration/group_speech.py',
 'integration/public_video_tool.py','integration/public_video_reader.py',
 'integration/public_read_policy.py','integration/reply_media_claims.py',
 'integration/native_voice_payload.py','integration/local_voice.py',
 'integration/wechat_video_source.py','integration/native_video_reader.py','integration/native_video_context.py',
 'tavern-instance/public/scripts/extensions/third-party/dafeiyu/reply-delivery.mjs',
 'integration/public_note_reader.py','integration/douyin_share.py',
 'runtime/dsh-home/profiles/dafeiyu-browser-eval/package.json',
 'runtime/dsh-home/profiles/dafeiyu-browser-eval/package-lock.json',
 'runtime/dsh-home/profiles/dafeiyu-browser-eval/cordis.patch.yml',
 'integration/tavern-plugin/index.mjs','integration/tavern-extension/index.js',
 'integration/tavern-plugin/speaker-identity.mjs','tavern-instance/plugins/dafeiyu/speaker-identity.mjs',
 'integration/tavern-plugin/queue-policy.mjs','tavern-instance/plugins/dafeiyu/queue-policy.mjs',
 'integration/reminders.py','integration/character_memory.py','integration/drawing_actions.py',
 'integration/image_animation.py','integration/voice_paths.py','local/binding.json','local/tavern.json',
 'runtime/isolation.json','runtime/tavern-jobs.json',
 'vendor/helper-source/native/text_service.py','vendor/helper-source/native/filehelper_service.py',
 'vendor/helper-source/native/reference_message.py','vendor/helper-source/native/text_bridge.cpp',
 'vendor/helper-source/native/selftest_bridge.cpp','integration/build-media-receive-v4.cmd',
 'vendor/helper-source/native/run_selftest.py','vendor/helper-source/native/compatibility.json',
 'vendor/helper-source/native/build_media_receive_v4/text_bridge.dll',
 'vendor/helper-source/wxbot_framework/account.py','vendor/helper-source/wxbot_framework/contacts.py',
 'vendor/helper-source/wxbot_framework/text.py','vendor/helper-source/wxbot_framework/mentions.py',
 'vendor/helper-source/wxbot_framework/bridge_lifecycle.py',
 'runtime/MaiBot/src/cli/tool.py','runtime/MaiBot/pyproject.toml','runtime/MaiBot/uv.lock',
 'tavern-instance/package.json','tavern-instance/package-lock.json',
 'tavern-instance/plugins/dafeiyu/index.mjs',
 'tavern-instance/public/scripts/extensions/third-party/dafeiyu/index.js',
 'voice-instance/tts.json','voice-instance/asr.json','voice-instance/characters.json',
 'voice-instance/models/kokoro-multi-lang-v1_1/model.onnx',
 'voice-instance/models/kokoro-multi-lang-v1_1/voices.bin',
 'voice-instance/models/sensevoice/model.int8.onnx','voice-instance/models/sensevoice/tokens.txt',
)

def audit(folder,manifest):
 folder=Path(folder).resolve();required=set(REQUIRED);invalid=[];roles=0
 native=folder/'runtime/native-build-sha256.json'
 if native.is_file():
  try:
   pins=json.loads(native.read_text(encoding='utf-8'))
   if not isinstance(pins,dict):raise ValueError('Invalid native manifest')
   for name,digest in pins.items():
    name=name.replace('\\','/')
    if Path(name).is_absolute() or '..' in Path(name).parts or not name.startswith('vendor/helper-source/native/') or not re.fullmatch('[0-9a-f]{64}',digest):raise ValueError('Invalid native pin')
    required.add(name)
    if name in manifest and manifest[name]!=digest:invalid.append('native binary pin mismatch: '+name)
  except (ValueError,TypeError,AttributeError):invalid.append('invalid backed-up native manifest')
 config=folder/'local/tavern.json'
 if config.is_file():
  try:
   for role in json.loads(config.read_text(encoding='utf-8')).get('roles',{}).values():
    avatar=role['avatar'];chat=role.get('chatFile')
    if not isinstance(avatar,str) or Path(avatar).name!=avatar or '\\' in avatar or '/' in avatar:raise ValueError('Invalid role avatar')
    required.add('tavern-instance/data/default-user/characters/'+avatar);roles+=1
    if chat:
     if not isinstance(chat,str) or Path(chat).name!=chat or '\\' in chat or '/' in chat:raise ValueError('Invalid chat name')
     required.add('tavern-instance/data/default-user/chats/'+Path(avatar).stem+'/'+chat+'.jsonl')
  except (ValueError,KeyError,TypeError):invalid.append('invalid backed-up role selection')
 missing=sorted(name for name in required if name not in manifest or not (folder/name).is_file())+invalid
 return {'contract_version':2,'required_count':len(required),'selected_roles':roles,'missing':missing,'content_hashes_checked_separately':True,'standalone_new_machine_recovery_proven':False,'external_requirements':['Existing Windows Python environments and installed dependencies, or rebuild them from captured locks','Installed DSH and its authorized login','Dedicated SillyTavern and Node runtime','Pinned WeChat 4.1.15.13 alt process; binding must be rechecked, not silently attached to a recycled PID','Existing local ComfyUI installation and drawing models']}
