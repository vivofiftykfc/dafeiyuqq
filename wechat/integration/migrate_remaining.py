"""Preserve separate source scopes for archived console/group conversations."""
import asyncio,json
from native_client import client,chat,ROOT
async def main():
    rows=json.loads((ROOT/'runtime/migration/turns.json').read_text(encoding='utf-8'))
    report=[]
    for source,uid in [('local-console','archive-console'),('wechat-group:["wxid_bot", "示例测试群"]','archive-group')]:
        with client() as c:sessions=c.get('/api/chat/sessions').json()['sessions']
        selected=next((s for s in sessions if s['user_id']=='webui_user_'+uid),None)
        if selected is None:
            await chat('这是旧记录的独立本地归档会话，仅用于保存来源，不连接微信。请只回复收到',user_id=uid)
            with client() as c:sessions=c.get('/api/chat/sessions').json()['sessions']
            selected=next(s for s in sessions if s['user_id']=='webui_user_'+uid)
        subset=[r for r in rows if r['chat']==source]
        body='旧聊天档案，来源：'+source+'\n'+'\n'.join(f"[{r['ts']}] {r['role']}: {r['content']}" for r in subset)
        with client() as c:
            r=c.post('/api/webui/memory/import/paste',json={'name':uid+'.txt','content':body,'chat_id':selected['session_id'],'scope_type':'chat','chat_log':True,'llm_enabled':True,'dedupe_policy':'content_hash'})
            r.raise_for_status();report.append({'source':source,'count':len(subset),'session_id':selected['session_id'],'result':r.json()})
    (ROOT/'runtime/migration/remaining.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Archived remaining source scopes:',len(report))
if __name__=='__main__':asyncio.run(main())
