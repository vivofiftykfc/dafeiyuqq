"""Import audited origin-specific history; preserve speaker IDs in each record."""
import json,time
from pathlib import Path
import httpx
from privacy_policy import ROOT,validate_isolation,GROUP_PEER
manifest=validate_isolation()
exports=json.loads((Path(manifest['backup'])/'source-selection.json').read_text(encoding='utf-8'))
report_path=ROOT/'runtime/privacy-migration.json'
report=json.loads(report_path.read_text(encoding='utf-8')) if report_path.exists() else {}
clients={}
for kind,entry in manifest['conversations'].items():
    path=Path(entry['instance'])
    token=json.loads((path/'data/webui.json').read_text())['access_token']
    c=httpx.Client(base_url=f"http://127.0.0.1:{entry['web_port']}",cookies={'maibot_session':token},timeout=60)
    clients[kind]=c
    if kind in report:continue
    sessions=c.get('/api/chat/sessions').json()['sessions']
    if kind=='private':selected=next(s for s in sessions if s.get('user_id')=='webui_user_dafeiyu-owner')
    else:selected=next(s for s in sessions if s.get('group_id')==GROUP_PEER)
    content=['以下为这个会话自己的历史记录。其他聊天不能检索或引用这些记录。身份以用户ID为准，不根据昵称合并。']
    for row in exports[kind]['legacy']:
        content.append(f"[{row['ts']}] {row['role']}: {row['content']}")
    for row in exports[kind]['messages']:
        content.append(f"[{row['timestamp']}] 用户ID={row['user_id']} 显示名={row['user_nickname']}: {row['processed_plain_text']}")
    response=c.post('/api/webui/memory/import/paste',json={'name':kind+'-scoped-history.txt','content':'\n'.join(content),'chat_id':selected['session_id'],'scope_type':'chat','chat_log':True,'llm_enabled':True,'dedupe_policy':'content_hash'})
    response.raise_for_status()
    result=response.json()
    if not result.get('success'):raise RuntimeError('History import rejected: '+kind)
    report[kind]={'session_id':selected['session_id'],'count':len(content)-1,'task_id':result['task']['task_id'],'status':'queued'}
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
deadline=time.monotonic()+180
while time.monotonic()<deadline:
    for kind,item in report.items():
        response=clients[kind].get('/api/webui/memory/import/tasks/'+item['task_id']);response.raise_for_status()
        task=response.json().get('task',{})
        item['status']=task.get('status','unknown')
        item['failed_chunks']=task.get('failed_chunks',0)
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    if all(x['status'] in ('completed','failed','cancelled','partial') for x in report.values()):break
    time.sleep(3)
print(json.dumps(report,ensure_ascii=False))
if any(x['status']!='completed' or x['failed_chunks'] for x in report.values()):raise RuntimeError('History import incomplete')
