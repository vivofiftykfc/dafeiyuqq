"""Small loopback UI for the owner's stable native MaiBot conversation."""
import asyncio,json
from pathlib import Path
from fastapi import FastAPI,WebSocket,WebSocketDisconnect
from fastapi.responses import HTMLResponse
import uvicorn,websockets
from native_client import BASE,token
app=FastAPI()
@app.get('/',response_class=HTMLResponse)
def index():return Path(__file__).with_name('chat.html').read_text(encoding='utf-8')
@app.get('/health')
def health():return {'service':'dafeiyu-chat','engine':'MaiBot','local':True}
@app.websocket('/ws')
async def bridge(browser:WebSocket):
    if browser.headers.get('origin') not in ('http://127.0.0.1:18003','http://localhost:18003'):
        await browser.close(code=1008);return
    await browser.accept()
    try:
        async with websockets.connect(BASE.replace('http','ws')+'/api/webui/ws',additional_headers={'Cookie':'maibot_session='+token()},max_size=8000000) as upstream:
            await upstream.send(json.dumps({'op':'call','id':'open','domain':'chat','method':'session.open','session':'owner','data':{'user_id':'dafeiyu-owner','user_name':'主人','restore':True}}))
            async def receive():
                async for raw in upstream:await browser.send_text(raw)
            async def send():
                while True:
                    data=await browser.receive_json()
                    content=str(data.get('content','')).strip()
                    if not content or len(content)>10000:continue
                    await upstream.send(json.dumps({'op':'call','id':str(data.get('id','send')),'domain':'chat','method':'message.send','session':'owner','data':{'content':content,'user_name':'主人'}}))
            tasks=[asyncio.create_task(receive()),asyncio.create_task(send())]
            done,pending=await asyncio.wait(tasks,return_when=asyncio.FIRST_COMPLETED)
            for task in pending:task.cancel()
            await asyncio.gather(*tasks,return_exceptions=True)
    except (WebSocketDisconnect,websockets.ConnectionClosed):pass
    except Exception:
        try:await browser.send_json({'event':'error','data':{'content':'聊天服务暂时不可用，请检查本地服务状态'}})
        except Exception:pass
if __name__=='__main__':uvicorn.run(app,host='127.0.0.1',port=18003,access_log=False)
