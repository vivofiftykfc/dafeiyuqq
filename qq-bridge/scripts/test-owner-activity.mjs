import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ownerActivity,screenshotFile} from '../src/owner-activity.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owner-activity-'));
try{
 fs.mkdirSync(path.join(dir,'phone-history'));fs.mkdirSync(path.join(dir,'phone-shots'));fs.mkdirSync(path.join(dir,'diary'));
 fs.writeFileSync(path.join(dir,'phone-shots','test.png'),'fixture');fs.utimesSync(path.join(dir,'phone-shots','test.png'),new Date('2026-10-23T01:00:00Z'),new Date('2026-10-23T01:00:00Z'));
 fs.writeFileSync(path.join(dir,'phone-history','2026-10-22.jsonl'),JSON.stringify({id:'1',at:'2026-10-22T17:00:00Z',tool:'phone_screenshot',phase:'requested',args:{}})+'\n'+JSON.stringify({id:'1',at:'2026-10-22T17:00:01Z',tool:'phone_screenshot',phase:'result',content:[{type:'text',text:'saved test.png'}]})+'\n{"partial":');
 fs.writeFileSync(path.join(dir,'douyin-outgoing-2026-10-23.json'),JSON.stringify({messages:[{to:'friend',text:'hello',sentAt:'2026-10-23 17:00 (Asia/Shanghai)',verified:true,verifyShot:'test.png'}]}));
 const data=ownerActivity(dir,'2026-10-23');assert.equal(data.counts.operations,1);assert.equal(data.counts.messages,1);assert.equal(data.events.find(e=>e.kind==='operation').status,'completed');assert.deepEqual(data.events.find(e=>e.kind==='message').shots,['test.png']);assert.equal(data.events[0].at,'2026-10-23T17:00:00+08:00');
 assert.throws(()=>ownerActivity(dir,'2026-02-31'));assert.throws(()=>screenshotFile(dir,'../memory.json'));assert.throws(()=>screenshotFile(dir,'test.png/../../config.json'));assert.throws(()=>screenshotFile(dir,'C:\\config.png'));assert.equal(screenshotFile(dir,'test.png'),path.join(dir,'phone-shots','test.png'));
 console.log('PASS Beijing date boundary, partial log, event merge, sent evidence, invalid dates and path traversal');
}finally{for(const sub of ['phone-history','phone-shots','diary']){for(const f of fs.readdirSync(path.join(dir,sub)))fs.unlinkSync(path.join(dir,sub,f));fs.rmdirSync(path.join(dir,sub));}fs.unlinkSync(path.join(dir,'douyin-outgoing-2026-10-23.json'));fs.rmdirSync(dir);}
