import assert from 'node:assert/strict';import {bridgeHarness} from './audit-bridge-harness.mjs';
const h=await bridgeHarness();let server;
try{server=h.startConsoleServer();if(!server.listening)await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
const call=async(route,body,extra={})=>{const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'x-console-token':'fixture-console-token','content-type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
const s=await call('/api/wechat-core/status');assert.equal(s.status,200);assert.equal(s.data.enabled,false);assert.equal(s.data.tavernRequired,false);
assert.equal((await call('/api/wechat-core/config',{enabled:true})).status,400,'preset readiness must block missing presets');
assert.equal((await call('/api/wechat-core/status',null,{'x-wechat-token':'bad'})).status,403);
assert.equal((await call('/api/wechat-core/tool',{action:'context',peer:'wxid_owner',token:'bad'},{'x-wechat-token':'bad'})).status,400);
assert.equal((await call('/api/wechat-core/config',{enabled:false})).status,200);
console.log('PASS real Bridge routing: disabled by default, preset readiness, scoped tool token, operator stop');
}finally{if(server)await new Promise(r=>server.close(r));await h.close();}
