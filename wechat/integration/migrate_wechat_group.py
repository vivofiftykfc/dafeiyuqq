"""Import only the previously authorized group's archived turns to its real scope."""
import json
from native_client import ROOT,client
report=ROOT/'runtime/migration/native-group.json'
if report.exists():
    print('Native group archive already submitted.')
else:
    route=json.loads((ROOT/'runtime/wechat-routes.json').read_text(encoding='utf-8'))
    group_id=route['contacts'].get('示例测试群')
    with client() as c:
        sessions=c.get('/api/chat/sessions').json()['sessions']
        selected=next((s for s in sessions if s.get('platform')=='dafeiyu-wechat' and s.get('group_id')==group_id),None)
        if not selected:
            print('Waiting for first real group message; no data changed.')
        else:
            source='wechat-group:["wxid_bot", "示例测试群"]'
            rows=[r for r in json.loads((ROOT/'runtime/migration/turns.json').read_text(encoding='utf-8')) if r['chat']==source]
            body='该工作群此前的聊天记录，仅限本群使用。\n'+'\n'.join(f"[{r['ts']}] {r['role']}: {r['content']}" for r in rows)
            response=c.post('/api/webui/memory/import/paste',json={'name':'native-wechat-group-history.txt','content':body,'chat_id':selected['session_id'],'scope_type':'chat','chat_log':True,'llm_enabled':True,'dedupe_policy':'content_hash'})
            response.raise_for_status()
            report.write_text(json.dumps({'count':len(rows),'session_id':selected['session_id'],'result':response.json()},ensure_ascii=False,indent=2),encoding='utf-8')
            print('Native group archive submitted:',len(rows))
