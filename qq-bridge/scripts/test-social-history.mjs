import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {ChatMemory} from '../src/chat-memory.js';
import {socialImpressionPrompt} from '../src/social-impression-prompt.js';
const m=new ChatMemory(path.join(fs.mkdtempSync(path.join(os.tmpdir(),'social-history-')),'test.sqlite'));
const result=source=>({affinityDelta:1,reason:'聊得投机',mood:'开心',intensity:0.8,impression:'我觉得这个人问问题很直接，聊起来很轻松。',strategy:'下次先接住问题，再聊点有趣的小细节。',evidence:[source.messages[0].event]});
try{
 for(let i=0;i<5;i++)m.append('qq','bot','group',{id:'a'+i,sender:'a',role:'in',text:'好奇的问题',at:i+1});
 m.append('qq','bot','group',{id:'reply',sender:'bot',role:'out',text:'我的解释',at:6});
 m.append('qq','bot','group',{id:'b',sender:'b',role:'in',text:'另一个人',at:7});
 await m.compact(async()=> '摘要',{onlyKey:m.key('qq','bot','group'),force:true,keep:2});
 const inputs=[];
 const initialized=await m.social.initializeHistory(async source=>{inputs.push(source);return result(source);});
 assert.equal(initialized.length,2);assert(initialized.every(r=>r.ok));
 assert.equal(inputs[0].messages.length,5);assert(inputs[0].conversation.some(r=>r.role==='out'));assert(!inputs[0].messages.some(r=>r.sender==='b'));
 const key=m.key('qq','bot','group');assert.equal(m.social.read(key,'a').affinity,55);assert.equal(m.social.read(key,'a').intensity,0);
 assert.equal((await m.social.initializeHistory(()=>{throw Error('must not repeat');},{rewriteExisting:true})).length,0);
 assert.equal(m.db.prepare('SELECT COUNT(*) n FROM social_pending').get().n,0);
 // Existing score is preserved when changing the wording using history.
 m.db.prepare('UPDATE social_state SET data=? WHERE k=? AND sender=?').run(JSON.stringify({affinity:49,mood:'平静',intensity:0,impression:'旧审查描述',strategy:'旧策略'}),key,'a');
 await m.social.initializeHistory(async source=>result(source),{rewriteExisting:true});
 assert.equal(m.social.read(key,'a').affinity,49);assert.equal(m.social.read(key,'a').lastChange.preserved,true);
 assert.match(socialImpressionPrompt(inputs[0]),/我和对方聊起来的感受/);
 console.log('PASS: archive recovery, two-way context, sender isolation, few-message initialization, idempotence, existing score preservation');
}finally{m.close();}
