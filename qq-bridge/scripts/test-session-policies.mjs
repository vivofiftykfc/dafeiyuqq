import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {bridgeHarness} from './audit-bridge-harness.mjs';
const h=await bridgeHarness({config:{agentPreset:'qq-chat',allow:{private:['123','789'],groups:['456','457']}},files:{'roles/测试.md':'一、角色身份\n一条温柔的蓝鲸。\n你唯一的哥哥是10000001\n七、关系与亲近感\n只对哥哥撒娇。\n八、独立思考与个人边界\n有自己的判断。','state/owner/identity.md':'主人原人格'}});
let server;
try{
 h.setMode('closed-agent');h.setPresets(['standard','qq-chat','qq-chat-v2','dafeiyu-owner']);
 server=h.startConsoleServer();if(!server.listening)await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const call=async(route,body,extra={})=>{const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'x-console-token':'fixture-console-token','content-type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 assert.equal((await call('/api/session-policies',{key:'group:456',mode:'closed-agent',proactive:'off'})).status,400);
 assert.equal((await call('/api/session-policies',{key:'group:456',mode:'reserved2',proactive:'off',role:'测试'})).status,200);
 assert.equal((await call('/api/session-policies',{key:'group:457',mode:'chat',proactive:'off'})).status,200);
 assert.equal(h.modeFor('private:123'),'closed-agent');assert.equal(h.modeFor('group:456'),'reserved2');assert.equal(h.modeFor('group:457'),'chat');
 await h.ensureSession('private:123');await h.ensureSession('group:456');await h.ensureSession('group:457');
 assert.deepEqual(h.calls.created.map(x=>x.agentPreset),['standard','qq-chat-v2','qq-chat']);
 const ownerSession=h.state.sessions['private:123'];const otherSession=h.state.sessions['group:457'];
 const guard=h.captureSendGuard('group:456');const token=h.getSocialV2State('group:456').agentToken;
 const preview=await call('/api/session-policies/preview?key=group:456');assert.equal(preview.status,200,JSON.stringify(preview.data));assert.match(preview.data.text,/蓝鲸/);assert.doesNotMatch(preview.data.text,/10000001/);
 assert.equal((await call('/api/session-policies',null,{'x-agent-token':token})).status,403);
 await call('/api/session-policies',{key:'group:456',mode:'off',proactive:'off'});
 assert.throws(guard,/取消/);assert.equal(h.state.sessions['private:123'],ownerSession);assert.equal(h.state.sessions['group:457'],otherSession);
 assert.equal((await call('/api/socialV2/prompt?key=group:456',null,{'x-agent-token':token})).status,403);
 await call('/api/session-policies',{key:'group:456',rollback:true});assert.equal(h.modeFor('group:456'),'reserved2');
 await call('/api/session-policies',{key:'group:999',mode:'reserved2',proactive:'off'});assert.equal(h.modeAllowed('group:999','group',999,h.cfg,'reserved2'),false);
 assert.equal(fs.readFileSync(path.join(h.temp,'state/owner/identity.md'),'utf8'),'主人原人格');
 const persisted=JSON.parse(fs.readFileSync(path.join(h.temp,'state/session-policies.json'),'utf8'));assert.equal(persisted.entries['group:456'].mode,'reserved2');
 console.log('PASS independent modes / presets / public persona / stale sends / token revocation / rollback / whitelist / protected persona');
}finally{if(server)await new Promise(r=>server.close(r));await h.close();}
