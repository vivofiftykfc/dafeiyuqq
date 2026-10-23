"""Authenticated loopback client for the unmodified MaiBot chat runtime."""
import asyncio, json, time
from pathlib import Path
import httpx, websockets
ROOT=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:18001'
def token():
    manifest=ROOT/'runtime/isolation.json'
    instance=Path(json.loads(manifest.read_text(encoding='utf-8'))['conversations']['private']['instance']) if manifest.exists() else ROOT/'runtime/instance'
    return json.loads((instance/'data/webui.json').read_text(encoding='utf-8'))['access_token']
def client():
    return httpx.Client(base_url=BASE,cookies={'maibot_session':token()},timeout=120)
async def chat(content,user_id='dafeiyu-owner',timeout=150):
    events=[]; replies=[]
    async with websockets.connect(BASE.replace('http','ws')+'/api/webui/ws',additional_headers={'Cookie':'maibot_session='+token()},max_size=8000000) as ws:
        await ws.send(json.dumps({'op':'call','id':'open','domain':'chat','method':'session.open','session':'local','data':{'user_id':user_id,'user_name':'主人','restore':True}}))
        while True:
            item=json.loads(await asyncio.wait_for(ws.recv(),30))
            if item.get('id')=='open':
                if not item.get('ok'):raise RuntimeError(item)
                break
        await ws.send(json.dumps({'op':'call','id':'send','domain':'chat','method':'message.send','session':'local','data':{'content':content,'user_name':'主人'}}))
        deadline=time.monotonic()+timeout
        while time.monotonic()<deadline:
            try:item=json.loads(await asyncio.wait_for(ws.recv(),min(15,deadline-time.monotonic())))
            except asyncio.TimeoutError:
                if replies:break
                continue
            events.append(item)
            data=item.get('data',{})
            if item.get('domain')=='chat' and item.get('event') in ('bot','bot_message'):
                replies.append(data)
        return {'input':content,'replies':replies,'events':events}
if __name__=='__main__':
    import sys
    result=asyncio.run(chat(sys.argv[1]))
    dest=ROOT/'runtime/native-last-test.json';dest.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False))
