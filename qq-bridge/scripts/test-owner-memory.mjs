import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {memoryPrompt,apply,sharedConversationPolicy} from '../plugins/owner-memory/index.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qq-owner-memory-'));
try{
 fs.writeFileSync(path.join(dir,'identity.md'),'蓝白小鲸鱼');
 const persist=facts=>fs.writeFileSync(path.join(dir,'memory.json'),JSON.stringify({facts:facts.map(fact=>({fact,evidence:'fixture'}))}));
 persist(['喜欢短句']);
 assert.match(memoryPrompt(dir),/喜欢短句/);
 persist(['喜欢短句','新增事实']);
 assert.match(memoryPrompt(dir),/新增事实/,'Prompt rebuild must read new disk state, not cached history');
 const again=await import('../plugins/owner-memory/index.mjs?fresh');
 assert.match(again.memoryPrompt(dir),/新增事实/,'Fresh session must recover persisted facts');
 fs.writeFileSync(path.join(dir,'self-development.json'),JSON.stringify({preferences:['测试偏好：留白配色'],viewpoints:[],expression:[]}));
 assert.match(memoryPrompt(dir),/留白配色/,'Growing preferences must survive rebuilt prompts');
 fs.writeFileSync(path.join(dir,'self-development.json'),JSON.stringify({preferences:['测试偏好：暖色'],viewpoints:[],expression:[]}));
 assert.match(again.memoryPrompt(dir),/暖色/,'Preference changes must be read from disk');
 persist(Array.from({length:100},(_,i)=>i+':'+('长'.repeat(300))));
 assert.ok(memoryPrompt(dir).length<3500,'Keep prompt memory bounded');
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'memory.json'))).facts.length,100,'Bound must not delete older facts');
 let section;
 apply({effect:fn=>fn(),systemPrompt:{getSectionOrder:()=>1,section:s=>{section=s;}}});
 assert.equal(typeof section.text,'function','DSH must recompute memory on each system prompt assembly');
 assert.equal(section.complete,true);
 assert.equal(sharedConversationPolicy(),fs.readFileSync(new URL('../config/conversation-policy.txt',import.meta.url),'utf8'));
 const sections=[];apply({effect:fn=>fn(),systemPrompt:{getSectionOrder:()=>1,section:s=>sections.push(s)}});
 assert.equal(sections.filter(s=>s.name==='owner:conversation-policy').length,1);
 console.log('PASS memory persistence, prompt reconstruction, fresh instance, bounded summary and retained history');
}finally{
 for(const name of ['identity.md','memory.json','self-development.json'])fs.unlinkSync(path.join(dir,name));
 fs.rmdirSync(dir);
}
