"""Repair learned test artifacts and group pacing without merging any memories."""
import json,sqlite3,time,shutil
from pathlib import Path
import tomlkit
from privacy_policy import ROOT,validate_isolation

manifest=validate_isolation()
base=ROOT/'runtime/backups'/('group-repair-'+str(int(time.time())));base.mkdir(parents=True)
persona=(ROOT/'assets/identity/PERSONALITY.md').read_text(encoding='utf-8')
persona=persona.replace('你：今天先不卷了\n你：来，给你留个靠着发呆的位置','你：这一天可算熬完了\n你：今晚先歇会儿，剩下的明天再收拾')
persona+='''

## 群聊修订：不装傻，不复读

性格基调是聪明、爽快、亲近，带一点俏皮；不是低幼装傻、贴吧嘴臭或处处抬杠。不要把“大肥鱼不知道哦”“懒得说”“不晓得”当万能回答，不用第三人称自称卖萌。不会就指出具体缺哪条信息，而不是回一个无意义词。
用户认真问代码、学习、资料时先完成请求。前句让你写 Hello world，后句“用汇编写”，就是沿用同一个任务切换语言：可以说明采用哪个架构系统并给代码，不能要求再 @ 才接上。用户说“完整”“一条发完”时不要强制拆句；代码块不要拆坏。看见别人在互相 @，先确认是在对谁说话，不自动冒认“是我”。
历史里自己发过的敷衍、空括号和重复消息是错误记录，不是人设示范。不要沿着它们继续复读。一个梗接住一次就够了，已经回应过的信息没有新进展就安静。不要输出空括号或把内部占位符当消息。看到纯图片但没有视觉结果时，不猜图片内容。
普通群聊可以主动接一个有内容的梗，接完收住，不充当主持人。不为凑热闹插话，避免和别人对骂。被说“不正常”“别装傻”时直接恢复正常表达，不演委屈、不继续卖萌。
'''
(ROOT/'assets/identity/PERSONALITY.md').write_text(persona,encoding='utf-8')
(ROOT/'workspace/SOUL.md').write_text(persona,encoding='utf-8')
for scope,entry in manifest['conversations'].items():
 p=Path(entry['instance'])/'config/bot_config.toml';shutil.copy2(p,base/(scope+'.toml'))
 d=tomlkit.parse(p.read_text(encoding='utf-8'))
 d['personality']['personality']=persona
 d['personality']['reply_style']='正常、机灵、亲近的中文群友语气。不要强行装傻、嘴臭、复读、每句撒娇。普通闲聊简短，代码与长文按用户要求完整回答；用户明确要求一条发完时保持完整，不强制每句话分条。'
 d['expression']['learning_list']=[{'platform':'','item_id':'','type':'group','use':False,'learn':False},{'platform':'','item_id':'','type':'private','use':False,'learn':False}]
 d['expression']['expression_checked_only']=True
 if scope=='group':
  d['chat']['reply_timing']['talk_value']=0.65
  d['chat']['reply_style']['group_chat_prompt']='阅读当前群的连续上下文，按真实用户 ID 分清发言人。回应正在跟你说话的人和他的追问，不要求每次都 @。没人叫你时，遇到相关话题或有趣的梗可自然插一句；别人互聊时不抢话。已经回答的内容不要复读。不假装看过未解码图片。'
 p.write_text(tomlkit.dumps(d),encoding='utf-8')
dbpath=Path(manifest['conversations']['group']['instance'])/'data/MaiBot.db'
c=sqlite3.connect(dbpath);backup=sqlite3.connect(base/'group-before.sqlite');c.backup(backup);backup.close()
# Archive only clearly broken bot outputs. Human records and knowledge remain untouched.
bad=('大肥鱼不知道哦','大肥鱼不知道','()','懒得说')
rows=c.execute('SELECT id,processed_plain_text FROM mai_messages WHERE user_id=? AND processed_plain_text IN (?,?,?,?)',('wxid_bot',*bad)).fetchall()
(base/'quarantined-output.json').write_text(json.dumps(rows,ensure_ascii=False),encoding='utf-8')
c.executemany('DELETE FROM mai_messages WHERE id=?',[(row[0],) for row in rows]);c.commit();c.close()
cardpath=ROOT/'character-card-v2.json';card=json.loads(cardpath.read_text(encoding='utf-8'))
card['data']['description']=persona;card['data']['system_prompt']=persona
card['data']['post_history_instructions']='认真接住当前任务和连续追问；不复读、装傻或嘴臭；长文和代码遵守用户格式要求。真实 ID 授权，会话隔离不变。'
cardpath.write_text(json.dumps(card,ensure_ascii=False,indent=2),encoding='utf-8')
print('Persona + group planner updated; archived broken bot rows:',len(rows))
