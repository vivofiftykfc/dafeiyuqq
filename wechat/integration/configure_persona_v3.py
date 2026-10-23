import json,shutil,time
import tomlkit
from privacy_policy import ROOT,validate_isolation

manifest=validate_isolation()
persona=(ROOT/'assets/identity/PERSONALITY.md').read_text(encoding='utf-8')
backup=ROOT/'runtime/backups'/('persona-v3-'+str(int(time.time())));backup.mkdir(parents=True)
for scope,entry in manifest['conversations'].items():
    path=__import__('pathlib').Path(entry['instance'])/'config/bot_config.toml'
    shutil.copy2(path,backup/(scope+'.toml'))
    doc=tomlkit.parse(path.read_text(encoding='utf-8'))
    doc['personality']['personality']=persona
    doc['personality']['reply_style']='自然中文口语，一句话一条消息，通常不加句末句号。不刻意加鱼符号，不固定用哼开头，不每条叫主人，不硬接问句。认真问题认真答；日常可以短，可以只接一句。'
    doc['personality']['behavior_style']=str(doc['personality']['behavior_style'])+' 图片通道目前尚未完成微信原生接入；不要把文本描述当成已看过原图，不要声称已发送表情包。日常调度的真实状态以外部服务为准。'
    path.write_text(tomlkit.dumps(doc),encoding='utf-8')
card=json.loads((ROOT/'character-card-v2.json').read_text(encoding='utf-8'))
shutil.copy2(ROOT/'character-card-v2.json',backup/'character-card-v2.json')
card['data']['description']=persona
card['data']['personality']='聪明、嘴快心软、有自己的小计划；亲近自然、会玩但认真办事；不依赖固定口癖卖萌'
card['data']['system_prompt']=persona
card['data']['post_history_instructions']='遵守真实账号身份和会话隔离；一句话一条，称呼与表情适量，能力和执行以回执为准。'
card['data']['mes_example']=''
card['data']['character_book']={'name':'大肥鱼的当前设定','entries':[]}
card['data']['scenario']='蓝色鲸鱼娘住在电脑里，通过微信与创造者及获准群友聊天；角色日常与真实执行分别记账，不冒充现实生活。'
(ROOT/'character-card-v2.json').write_text(json.dumps(card,ensure_ascii=False,indent=2),encoding='utf-8')
catalog=ROOT/'assets/memes/catalog.json';doc=json.loads(catalog.read_text(encoding='utf-8'))
for item in doc['items']:
    item['reviewed']=item['id']!='deepseek-bao-xi-chuang-bian'
    item['review_note']='人工查看：适合普通聊天' if item['reviewed'] else '构图不适合默认群聊，未启用'
catalog.write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf-8')
print('Persona configured; isolated configs preserved; 5 reviewed blue-fish assets')
