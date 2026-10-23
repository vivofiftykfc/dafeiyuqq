"""Native transport adapter. No Tavern calls, persona rewriting, or model generation."""
import asyncio,json
from pathlib import Path
from contextlib import asynccontextmanager,AsyncExitStack
import httpx
ROOT=Path(__file__).resolve().parents[2]/'qq-bridge'
def enabled():
    file=ROOT/'state/wechat-core/config.json'
    return file.exists() and json.loads(file.read_text(encoding='utf-8')).get('enabled') is True
async def api(route,body=None):
    cfg=json.loads((ROOT/'config.json').read_text(encoding='utf-8-sig'))
    async with httpx.AsyncClient(base_url='http://127.0.0.1:'+str(cfg.get('consolePort',3100)),trust_env=False,timeout=15) as client:
        response=await client.request('POST' if body is not None else 'GET','/api/wechat-core/'+route,headers={'x-console-token':cfg['consoleToken']},json=body)
        response.raise_for_status();data=response.json()
        if not data.get('ok'):raise RuntimeError(data.get('error','QQ Bridge rejected'))
        return data
async def submit(data,event_id,text,visual_id=None):
    from wechat_native_probe import EXPECTED
    return await api('incoming',{'account':EXPECTED,'peer':data['chat_id'],'sender':data['sender_id'],'id':event_id,'text':text,**({'visualId':visual_id} if visual_id else {})})
class IdleSocket:
    async def send(self,*args):pass
    async def recv(self):return '{"id":"open","ok":true}'
    async def ping(self):pass
@asynccontextmanager
async def channels(config,use_core):
    if use_core:
        state=await api('status')
        if not state.get('enabled'):raise RuntimeError('QQ Bridge core not enabled')
        yield IdleSocket(),IdleSocket();return
    import websockets
    from native_client import BASE,token
    async with AsyncExitStack() as stack:
        owner=await stack.enter_async_context(websockets.connect(BASE.replace('http','ws')+'/api/webui/ws',additional_headers={'Cookie':'maibot_session='+token()},max_size=8000000))
        group=await stack.enter_async_context(websockets.connect(config['url'],additional_headers={'platform':'dafeiyu-wechat','authorization':config['token']},max_size=8000000))
        yield owner,group
async def drain(send,stop):
    from wechat_native_probe import EXPECTED
    while not stop.exists():
        try:
            row=(await api('claim',{'account':EXPECTED})).get('item')
            if row:
                confirmed=False
                try:
                    valid=await api('validate',{'account':EXPECTED,'id':row['id']})
                    if valid['ok']:confirmed=bool(await send(row))
                finally:
                    # No replay if native send or its receipt is uncertain.
                    await api('receipt',{'account':EXPECTED,'id':row['id'],'ok':confirmed})
        except Exception:
            import logging
            logging.exception('QQ Bridge WeChat delivery not confirmed; no automatic replay')
        await asyncio.sleep(1)
