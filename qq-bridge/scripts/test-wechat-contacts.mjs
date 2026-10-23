import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {WechatCore,WECHAT_ACCOUNT as account,WECHAT_OWNER as owner} from '../src/wechat-core.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wechat-contacts-')),scopes=[];
const core=new WechatCore({dir,memory:{context:()=>({summary:'',recent:[]})},modelFactory:scope=>{scopes.push(scope);return {reply:async()=>''};}});
try{
 await core.configure({enabled:true});const peer='wxid_example';
 assert.throws(()=>core.editContact({action:'add',peer:owner,label:'假主人',enabled:true}));
 assert.throws(()=>core.editContact({action:'add',peer:'nick name',label:'名字',enabled:true}));
 core.editContact({action:'add',peer,label:'朋友',enabled:true});assert(core.allowed(peer));assert.throws(()=>core.editContact({action:'add',peer,label:'重复',enabled:true}));
 assert.throws(()=>core.receive({account,peer,sender:owner,id:'wrong',text:'spoof'}));
 core.receive({account,peer,sender:peer,id:'hello',text:'hi'});const token=core.chat(peer).token;await core.wake(peer);assert.deepEqual(scopes,['group']);
 await assert.rejects(core.tool('image-generate',{peer,token,text:'host task'}),/owner-only/);
 const media=await core.tool('media-list',{peer,token});assert(Array.isArray(media.stickers));
 await assert.rejects(core.tool('media-send',{peer,token,kind:'voice',resource:'owner-resource'}),/another conversation/);
 await assert.rejects(core.tool('exec',{peer,token,command:'whoami'}),/Unknown tool/);
 assert.match(core.context(peer).capabilities.voice,/wechat_voice_generate/);
 fs.writeFileSync(path.join(dir,'contact-directory.json'),JSON.stringify({account,updated:Date.now(),items:[{peer,alias:'fixture_alias',label:'好友'}]}));
 assert.equal(core.resolveContact('fixture_alias').contact.peer,peer);assert.throws(()=>core.resolveContact('missing'));
 fs.writeFileSync(path.join(dir,'contact-directory.json'),JSON.stringify({account:'wrong',updated:Date.now(),items:[{peer,alias:'fixture_alias'}]}));assert.throws(()=>core.resolveContact('fixture_alias'));
 const row=await core.tool('send',{peer,token,id:'answer',text:'hello'});core.editContact({action:'edit',peer,label:'改备注',enabled:false});assert.equal(core.allowed(peer),false);assert.equal(core.state.outbox.find(x=>x.id===row.id).state,'cancelled');await assert.rejects(core.tool('context',{peer,token}));
 core.editContact({action:'edit',peer,label:'改备注',enabled:true});assert(core.allowed(peer));assert.notEqual(core.chat(peer).token,token);
 core.editContact({action:'remove',peer});assert.equal(core.allowed(peer),false);assert(core.state.chats[peer]);assert.throws(()=>core.receive({account,peer,sender:peer,id:'later',text:'hi'}));
 console.log('PASS WeChat contacts: add/edit/pause/remove, persisted config, fixed owner, sender identity, no owner tools, token revocation, queued cancellation, history retained');
}finally{await core.close();}
