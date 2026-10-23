"""Record observed receipts and the user's explicit delivery confirmation."""
import json,sqlite3,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
db=sqlite3.connect(ROOT/'runtime/wechat-delivery.sqlite')
counts=[{'target':row[0],'state':row[1],'count':row[2]} for row in db.execute('select target,state,count(*) from receipts group by target,state')]
report={'recorded_at':time.time(),'user_confirmed_private_and_group_delivery':True,'account':'wxid_bot','ui_automation_used':False,'offline_tests_passed':59,'transport_test':json.loads((ROOT/'runtime/wechat-transport-test.json').read_text(encoding='utf-8')),'receipts':counts,'limitations':['text only','exact requested bubble count not guaranteed','restart requires elevated bridge launcher on this machine','group/private contextual isolation is configured but not adversarially audited','no unsolicited proactive scheduling or Moments or friend requests']}
(ROOT/'runtime/wechat-acceptance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
for name in ('README.md','HANDOFF.md'):
    path=ROOT/name
    value=path.read_text(encoding='utf-8').replace('工作群 ID 已解析，真实群 @ 验收待完成。','指定工作群真实 @ 收发也已通过，用户确认两边都收到回复。')
    path.write_text(value,encoding='utf-8')
path=ROOT/'WECHAT-NATIVE.md'
value=path.read_text(encoding='utf-8').replace('已完成源码编译、账号只读核验、适配器与本地协议测试；真实微信收发验收以 runtime/wechat-bridge-state.json 和 runtime/wechat-delivery.sqlite 为准。','源码编译、账号核验、私聊及工作群真实 @ 收发均已完成；用户确认两边收到回复。验收记录 runtime/wechat-acceptance.json；当前状态 runtime/wechat-bridge-state.json；发送回执 runtime/wechat-delivery.sqlite。')
value=value.replace('群与私聊记忆隔离。','群与私聊使用独立聊天流，全局记忆共享关闭。人物偏好和人设可能仍共同使用，未做严格隐私隔离的对抗验收。')
value += '\n实际微信验收：主号新消息触发长期记忆查询与多条回复；工作群真实 @ 触发独立群会话和多条回复；两边均有原生成功回执且用户确认收到。请求两条时模型仍可能发更多气泡，尚未实现硬性条数约束。此前两条群历史已提交至真实群会话记忆导入任务，具体完成状态需查看任务结果。\n'
path.write_text(value,encoding='utf-8')
print('Recorded verified private/group delivery and limitations.')
