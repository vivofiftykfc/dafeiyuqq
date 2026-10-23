// Verify the Python writer and Node reader against the SAME disposable SQLite DB.
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ChatMemory} from '../src/chat-memory.js';
const root=process.env.DAFEIYU_WECHAT_ROOT||path.resolve(import.meta.dirname,'../../wechat');
const python=path.join(root,'runtime/wechat-env/Scripts/python.exe');
// The installed WeChat Python runtime can write only its project-owned directories.
const base=path.join(root,'integration');
const dir=fs.mkdtempSync(path.join(base,'wechat-memory-contract-'));
const file=path.join(dir,'test.sqlite');
const write=()=>{
 const code=`from unified_chat_memory import remember\nimport sys\nfor i in range(30): remember('fixture-bot','fixture-peer',str(i),'in','长'*22000+'尾部约定' if i==0 else 'fixture '+str(i),sender='fixture-peer',file=sys.argv[1])`;
 const result=spawnSync(python,['-X','utf8','-c',code,file],{cwd:path.join(root,'integration'),encoding:'utf8',timeout:30000});
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.stderr,'','Python writer logged an error: '+result.stderr);
};
write(); // Python must also work before the Node schema has been created.
const db=new ChatMemory(file),k=db.key('wechat','fixture-bot','fixture-peer');
try{
 assert.equal(db.context('wechat','fixture-bot','fixture-peer',{all:true}).recent[0].text,'长'.repeat(22000)+'尾部约定');
 assert.equal(db.db.prepare('SELECT COUNT(*) n FROM social_pending WHERE k=?').get(k).n,30);
 await db.compact(async()=> 'fixture summary',{onlyKey:k,force:true,keep:24});
 write();
 assert.equal(db.context('wechat','fixture-bot','fixture-peer',{all:true}).recent.length,24,'Archived events must not be replayed');
 assert.equal(db.db.prepare('SELECT COUNT(*) n FROM message_receipts WHERE k=?').get(k).n,30);
 assert.equal(db.context('wechat','fixture-bot','other').recent.length,0);
 assert.equal(db.context('qq','fixture-bot','fixture-peer').recent.length,0);
 console.log('PASS Python-first schema, full long text, social queue, permanent dedup after compaction, cross-platform isolation');
}finally{db.close();}
