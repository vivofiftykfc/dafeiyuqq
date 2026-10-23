"""Apply conservative, semantic-first group participation without touching DM."""
from pathlib import Path
import shutil,tomlkit
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'runtime/isolated/group-work/config/bot_config.toml'
backup=ROOT/'runtime/group-config-before-participation-20261023.toml'
if not backup.exists():shutil.copy2(p,backup)
d=tomlkit.parse(p.read_text(encoding='utf-8'))
d['bot']['alias_names']=['小鲸鱼','奥本海羊']
t=d['chat']['reply_timing']
t['talk_value']=0.35
t['mentioned_bot_reply']=False
t['planner_message_steering']=False
t['no_action_backoff_base_seconds']=20.0
t['no_action_backoff_cap_seconds']=90.0
t['no_action_backoff_bypass_pending_count']=0
old=str(d['personality']['behavior_style'])
start=old.index('没有@也可以接话：')
end=old.index('面对梗图',start)
rule='''【先判断是否需要回复，再考虑怎么表达】每轮先确认：这批话在对谁说？是否有尚未回应的请求？自己是否能增加新的、贴题的内容？不满足就结束本轮或安静等待，不调用 reply，也不发送“我先不说了”等旁白。被 @ 只是进入判断，不意味着必须回应空点名、已处理的旧消息或每个表情。
别人解释机器人的实现、第三人称评价她、向另一位群友指认身份（例如 @另一个人说“是这个人”），默认是群友互聊，不自辩、不接一句给自己找补。“666”、普通应和、独立表情包、对上一句话的情绪反应，通常无需回复。有人提到她不等于在向她提问。
没有 @ 时仍可回答面向全群的明确开放问题，或接住明确对自己上一句的追问；单纯有趣、命中兴趣关键词、自己能想到一句俏皮话，不足以发言。刚回过一句后提高门槛：没有新问题、新请求或重要补充就停，不逐条点评同一批消息，不反复把话题拉回自己。不要因为没接过话就补发旧话题。多人消息先看完整批次，只选一个最值得回应且尚未处理的对象；拿不准对话对象时优先不插嘴。判断保留在内部，最终不要输出判断过程。
'''
d['personality']['behavior_style']=tomlkit.string(old[:start]+rule+old[end:])
d['chat']['reply_style']['group_chat_prompt']='先判断是否需要你回应。明确提问或追问优先；第三人称谈论你、别人互聊、应和、表情、重复话头通常保持安静。无@开放求助仍可接，但不能为了展示性格找话。决定回应后一次一个短气泡，接住就停，不自辩、不点评每条。'
result=tomlkit.dumps(d)
parsed=tomlkit.parse(result)
assert parsed['chat']['reply_timing']['talk_value']==0.35
assert parsed['chat']['reply_timing']['inevitable_at_reply'] is True
assert '先判断是否需要回复' in parsed['personality']['behavior_style']
p.write_text(result,encoding='utf-8')
print('Group-only participation configuration saved and parsed; DM unchanged.')
