import assert from 'node:assert/strict';import {registerWechatTools} from '../plugins/qq-agent-presets/wechat-tools.mjs';
const definitions=new Map();registerWechatTools({tools:{register:t=>definitions.set(t.name,t)}},{group:true});
assert.equal(definitions.size,9);assert(![...definitions.keys()].some(n=>/pwsh|exec|file_read|image_generate|phone/.test(n)));
const tool=[...definitions.values()].find(t=>t.name.endsWith('wechat_get_context'));const original=globalThis.fetch;
globalThis.fetch=async(url,options)=>{assert.equal(JSON.parse(options.body).peer,'wxid_example');return {ok:true,json:async()=>({ok:true,fixture:true})};};
try{assert.match(await tool.execute({peer:'wxid_example',token:'fixture'}),/fixture/);await assert.rejects(tool.execute({peer:'wxid_owner',token:'fixture'}),/owner/);}finally{globalThis.fetch=original;}
console.log('PASS scoped friend tools: registered media, friend address allowed, owner rejected, no host tools; mocked transport');
