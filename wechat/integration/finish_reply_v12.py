import json,sqlite3,time,tomlkit
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for slug in ('private-owner','group-work'):
    p=ROOT/'runtime/isolated'/slug/'config/bot_config.toml'
    d=tomlkit.parse(p.read_text(encoding='utf-8'))
    extra='\n科学与电影类比必须标明边界；不确定的专业结论先查证或省略，不能为了文艺感编出推导。闲聊默认两三句讲一个观点，用户追问再深入。'
    if slug=='group-work':extra+='\n群里默认日常聊天、接梗和分享，不主动引入理工哲学电影分析；只有有人明确问才简短回应。博学兴趣主要在主人私聊展开，不是群聊发言理由。'
    d['personality']['behavior_style']=tomlkit.string(str(d['personality']['behavior_style'])+extra)
    if slug=='private-owner':d['response_splitter']['enable']=False
    p.write_text(tomlkit.dumps(d),encoding='utf-8')
db=sqlite3.connect(ROOT/'runtime/isolated/private-owner/data/MaiBot.db')
question=db.execute("SELECT id,message_id,timestamp,processed_plain_text FROM mai_messages WHERE processed_plain_text LIKE '电影里如果能预知未来%' ORDER BY id DESC LIMIT 1").fetchone()
replies=db.execute("SELECT message_id,timestamp,processed_plain_text FROM mai_messages WHERE id>? AND user_id='self' ORDER BY id LIMIT 3",(question[0],)).fetchall() if question else []
db.close();delivery=sqlite3.connect(ROOT/'runtime/wechat-delivery.sqlite')
sent=delivery.execute("SELECT id,target,state,updated FROM receipts WHERE target='wxid_owner' AND state='sent' AND updated>=? ORDER BY updated",(question[2],)).fetchall() if question else []
delivery.close()
report={'question':question,'following_messages':replies,'delivery_receipts_in_time_window':sent,'note':'Time-window receipts confirm native sends, not one-to-one message hashes. First following message belongs to prior request; philosophy answer is subsequent two messages. Group test cancelled by user. Comfort follow-up not received at capture time.','time':time.time()}
(ROOT/'runtime/persona-v12-wechat-acceptance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('Saved private WeChat evidence and group scope; disabled mechanical private sentence splitting.')
