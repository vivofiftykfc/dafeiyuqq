import assert from 'node:assert/strict';import {startDouyin,stopDouyin} from './start-douyin-bot.mjs';
const base={transport:'direct',connected:false,enabled:false,rosterBusy:false,roster:[{name:'allowed',reply:true},{name:'blocked',reply:false}],baselineCount:0,phase:'关闭'};
function fixture(extra={}){let s={...base,...extra},clock=0;const writes=[];return {writes,options:{now:()=>clock,sleep:async ms=>{clock+=ms},timeout:2000,request:async body=>{if(body){writes.push(body);if(body.action==='connect')s={...s,connected:true};if(body.enabled)s={...s,enabled:true,baselineCount:1,phase:'实时监听新私信（HTTP/WebSocket）'};}return s;}}};}
let f=fixture();assert.equal((await startDouyin(f.options)).enabled,true);assert.deepEqual(f.writes,[{action:'connect'},{enabled:true,friends:['allowed']}]);
f=fixture({connected:true,enabled:true,baselineCount:1,phase:'实时监听新私信'});await startDouyin(f.options);assert.deepEqual(f.writes,[]);
f=fixture();await startDouyin({...f.options,connectOnly:true});assert.deepEqual(f.writes,[{action:'connect'}]);
f=fixture({connected:true,roster:[]});await assert.rejects(startDouyin(f.options),/没有获准/);assert.deepEqual(f.writes,[]);
f=fixture({connected:false,rosterBusy:true});await assert.rejects(startDouyin(f.options),/尚未就绪/);assert.deepEqual(f.writes,[]);
f=fixture({connected:true,rosterBusy:true});await assert.rejects(startDouyin(f.options),/尚未就绪/);assert.deepEqual(f.writes,[]);
// A connected transport can still be refreshing its roster. Never enable with stale names.
let reads=0,writes=[];
await startDouyin({request:async body=>{if(body)writes.push(body);return {...base,connected:true,rosterBusy:++reads<3,roster:reads<3?base.roster:[{name:'fresh',reply:true}],enabled:writes.length>0,baselineCount:1,phase:'实时监听'};},sleep:async()=>{}});
assert.deepEqual(writes,[{enabled:true,friends:['fresh']}]);
f=fixture({transport:'phone'});await assert.rejects(startDouyin(f.options),/协议接入/);assert.deepEqual(f.writes,[]);
const stopWrites=[];
assert.deepEqual(await stopDouyin({request:async body=>{stopWrites.push(body);return {connected:true,enabled:false,phase:'已关闭'};}}),{connected:true,enabled:false,phase:'已关闭'});
assert.deepEqual(stopWrites,[{enabled:false}]);
await assert.rejects(stopDouyin({request:async()=>({enabled:true})}),/未确认/);
console.log('PASS: connect, saved allowlist only, idempotence, connect-only, empty roster, timeout, old transport rejection and connected roster refresh; no live API calls');
