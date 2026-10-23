import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {ChatMemory} from '../src/chat-memory.js';import {relevantExperiences,isOwner} from '../src/conversation-continuity.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'continuity-test-')),db=new ChatMemory(path.join(dir,'db.sqlite'));
const k=db.key('qq','bot','private:one');
const add=(id,text)=>db.append('qq','bot','private:one',{id,role:'in',text,sender:'one'});
try{
 add('1','周六去南门看展');
 await db.continuity.refresh(async()=>({items:[{kind:'commitment',status:'open',text:'对方约定周六南门看展',evidence:[{event:'1',quote:'周六去南门看展'}]}]}));
 let item=db.continuity.read(k)[0];assert.equal(item.status,'open');
 add('2','改成周日，还是南门看展');
 await db.continuity.refresh(async()=>({items:[{id:item.id,kind:'commitment',status:'open',text:'改为周日南门看展',evidence:[{event:'2',quote:'改成周日，还是南门看展'}]}]}));
 add('3','南门看展取消了');
 await db.continuity.refresh(async()=>({items:[{id:item.id,kind:'commitment',status:'cancelled',text:'看展已取消',evidence:[{event:'3',quote:'南门看展取消了'}]}]}));
 assert.equal(db.continuity.read(k)[0].status,'cancelled');assert.equal(db.continuity.read(db.key('qq','bot','other')).length,0);
 add('4','另一个未完成话题');await assert.rejects(db.continuity.refresh(async()=>({items:[{kind:'topic',status:'open',text:'伪造',evidence:[{event:'4',quote:'不存在的原话'}]}]})),/原话/);
 assert.equal(db.db.prepare('SELECT COUNT(*) n FROM continuity_pending').get().n,1);
 await db.compact(async()=> '临时摘要',{onlyKey:k,force:true,keep:1});assert.equal(db.db.prepare('SELECT COUNT(*) n FROM archives').get().n,1);assert.equal(db.continuity.read(k)[0].status,'cancelled');
 fs.mkdirSync(path.join(dir,'diary'));fs.writeFileSync(path.join(dir,'diary/index.jsonl'),JSON.stringify({t:1,day:'2026-10-23',time:'12:00',text:'三体相关私人想法'})+'\n');
 fs.writeFileSync(path.join(dir,'observations.jsonl'),JSON.stringify({at:'2026-10-23',source:'fixture',summary:'三体阅读公开记录',visibility:'public'})+'\n'+JSON.stringify({summary:'三体主人隐私',visibility:'private'})+'\n');
 assert.equal(relevantExperiences('三体',{owner:false,dir}).length,1);assert.equal(relevantExperiences('三体',{owner:true,dir}).length,3);assert.equal(relevantExperiences('足球',{owner:true,dir}).length,0);
 assert(isOwner('qq','10000002','private:10000001',{qq:{botAccount:'10000002',privatePeer:'private:10000001'}}));assert(!isOwner('douyin','11000001','11000002'));assert(!isOwner('wechat','wrong','wxid_owner'));
 console.log('PASS sourced corrections/cancellation, invalid evidence rollback, account isolation, archive survival, relevant retrieval, private diary exclusion, owner identity gates');
}finally{db.close();}
