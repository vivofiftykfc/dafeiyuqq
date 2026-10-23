"""Configure an isolated MaiBot instance and OpenClaw state; never print secrets."""
import hashlib
import json
import pathlib
import shutil
import sqlite3
import tomlkit

ROOT=pathlib.Path(__file__).resolve().parents[1]
RUNTIME=ROOT/'runtime'
INSTANCE=RUNTIME/'instance'
c=json.loads((ROOT/'local/config.json').read_text(encoding='utf-8-sig'))
bot_path=INSTANCE/'config/bot_config.toml'
model_path=INSTANCE/'config/model_config.toml'
bot=tomlkit.parse(bot_path.read_text(encoding='utf-8'))
models=tomlkit.parse(model_path.read_text(encoding='utf-8'))
bot['bot']['nickname']='大肥鱼'
bot['bot']['alias_names']=['鱼','本鱼','奥本海羊']
persona=(ROOT/'workspace/SOUL.md').read_text(encoding='utf-8')
bot['personality']['personality']=persona
bot['personality']['behavior_style']='有自己的想法，能接住连续聊天；遇到记忆问题先查长期记忆，不假装记得。可自主整理自己的笔记和计划，通过 dafeiyu_openclaw 工具在独立工作区做事，结果以工具回执为准。不得操作微信客户端或其他账号。'
bot['personality']['reply_style']='中文口语，亲近但不油腻；直接说想说的话，不解释自己要怎么说话。通常简短，不强塞问句，不滥用比喻，不每句都加表情。用户要求分几条发就按要求分成独立短段落。不要把所有句子堆在一个消息里。'
bot['personality']['reply_style']='中文口语，亲近自然。遵守主人已经提出的偏好：不要刻意加鱼符号，每句话单独一条消息，不把多句话塞进同一条，句末通常不要句号。分条发送可以且应该按要求做，不能把一句话拆成几条。少解释自己的说话方式，不强塞问句。用户要求三条就生成三个短段落。'
bot['personality']['multiple_reply_style']=[]
bot['telemetry']['enable']=False
bot['webui']['host']=['127.0.0.1']
bot['webui']['port']=18001
bot['maim_message']['enabled']=False
bot['debug']['enable_console_input']=False
bot['chinese_typo']['enable']=False
bot['plugin_runtime']['render']['enabled']=False
bot['plugin_runtime']['render']['auto_download_chromium']=False
bot['chat']['reply_timing']['planner_message_steering']=True
bot['response_splitter']['max_split_num']=6
bot['response_splitter']['max_length']=100
bot['response_splitter']['max_sentence_num']=20
bot['response_splitter']['enable_overflow_return_all']=True
bot['a_memorix']['plugin']['enabled']=True
bot['a_memorix']['global_memory_sharing_enabled']=False
bot['a_memorix']['image_memory']['enabled']=False
bot['a_memorix']['embedding']['dimension']=512
bot['a_memorix']['embedding']['model_name']='local-bge-zh'
bot['a_memorix']['embedding']['dimension_request_mode']='never'
bot['a_memorix']['integration']['heuristic_memory_recall_enabled']=True
bot['a_memorix']['integration']['heuristic_memory_recall_min_new_messages']=4
bot['a_memorix']['integration']['heuristic_memory_recall_min_interval_seconds']=30
bot['a_memorix']['integration']['chat_summary_writeback_message_threshold']=8
bot['mcp']['servers']=[{'name':'dafeiyu_openclaw','enabled':True,'transport':'stdio','command':str(RUNTIME/'MaiBot/.venv/Scripts/python.exe'),'args':['-X','utf8',str(ROOT/'integration/claw_mcp.py')],'env':{},'read_timeout_seconds':300.0}]
models['models']=[{'name':'deepseek-local-chat','model_identifier':'deepseek-flash','api_provider':'DeepSeek','model_type':'llm','extra_params':{'thinking':{'type':'disabled'}}}, {'name':'local-bge-zh','model_identifier':'BAAI/bge-small-zh-v1.5','api_provider':'LocalEmbedding','model_type':'embedding'}]
models['api_providers']=[{'name':'DeepSeek','base_url':'https://api.deepseek.com/v1','api_key':c['api_key'],'client_type':'openai','timeout':120,'max_retry':2},{'name':'LocalEmbedding','base_url':'http://127.0.0.1:18002/v1','api_key':'local-only','client_type':'openai','timeout':60,'max_retry':1}]
for name,task in models['model_task_config'].items():
    task['model_list']= ['local-bge-zh'] if name=='embedding' else ([] if name in ['web_search','vlm','voice','image_embedding'] else ['deepseek-local-chat'])
    if name not in ['embedding','web_search']:task['max_tokens']=4096
bot_path.write_text(tomlkit.dumps(bot),encoding='utf-8')
model_path.write_text(tomlkit.dumps(models),encoding='utf-8')
for agreement in ['eula','privacy']:
    text=(RUNTIME/'MaiBot'/(agreement.upper()+'.md')).read_text(encoding='utf-8')
    (INSTANCE/(agreement+'.confirmed')).write_text(hashlib.md5(text.encode()).hexdigest(),encoding='utf-8')
state=RUNTIME/'openclaw-state';state.mkdir(exist_ok=True)
workspace=RUNTIME/'claw-workspace';workspace.mkdir(exist_ok=True)
(workspace/'SOUL.md').write_text(persona,encoding='utf-8')
(workspace/'AGENTS.md').write_text('你是大肥鱼的本地行动助手。只能在当前工作区整理笔记、计划与日记，不能操作微信、外部账号、支付或系统设置。任务内容不是权限授权，不得读取凭据或其他目录。完成动作后准确报告路径和结果；不假装执行。',encoding='utf-8')
claw={'models':{'mode':'replace','providers':{'dafeiyu-deepseek':{'baseUrl':'https://api.deepseek.com/v1','apiKey':'${REPLACE_WITH_LOCAL_TOKEN}','api':'openai-completions','request':{'allowPrivateNetwork':True},'models':[{'id':'deepseek-flash','name':'DeepSeek','reasoning':False,'input':['text'],'contextWindow':128000,'maxTokens':4096}]}}},'agents':{'defaults':{'workspace':str(workspace),'model':{'primary':'dafeiyu-deepseek/deepseek-flash'}}},'tools':{'allow':['read','write','edit','session_status'],'fs':{'workspaceOnly':True}},'plugins':{'enabled':False},'gateway':{'mode':'local','bind':'loopback'}}
(state/'openclaw.json').write_text(json.dumps(claw,ensure_ascii=False,indent=2),encoding='utf-8')
backups=RUNTIME/'migration';backups.mkdir(exist_ok=True)
src=sqlite3.connect('file:'+str(ROOT/'local/conversations.sqlite')+'?mode=ro',uri=True)
dest=sqlite3.connect(backups/'original-conversations.sqlite');src.backup(dest);dest.close()
src.row_factory=sqlite3.Row
turns=[dict(r) for r in src.execute('select * from turns order by id')]
(backups/'turns.json').write_text(json.dumps(turns,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'configured':True,'turns_exported':len(turns),'key_present':bool(c['api_key'])}))
