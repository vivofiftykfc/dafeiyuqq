const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto'),vm=require('vm'),assert=require('assert');
let nextJob;
let clock=Date.now();
class TestDate extends Date{static now(){return clock}}
const root=fs.mkdtempSync(path.join(os.tmpdir(),'dafeiyu-journal-'));
fs.mkdirSync(path.join(root,'runtime'),{recursive:true});fs.mkdirSync(path.join(root,'local'));
fs.writeFileSync(path.join(root,'runtime/owner-ops.json'),JSON.stringify({token:'test-only'}));
fs.writeFileSync(path.join(root,'local/tavern.json'),JSON.stringify({roles:{private:{avatar:'a.png',name:'A',chatFile:'private-a'}}}));
function load(){
 const routes={};const router={use:()=>{},post:(key,fn)=>routes[key]=fn,get:()=>{}};
 const context={fs,path,crypto,nextJob,express:{json:()=>{}},Buffer,Date:TestDate,execFile:()=>{},promisify:()=>{},AbortSignal,fetch:()=>{throw Error('No network in test')}};
 let code=fs.readFileSync('integration/tavern-plugin/index.mjs','utf8').replace(/^import[^\n]+\n/gm,'').replace(/export /g,'').replace(/const root='[^']+';/,`const root=${JSON.stringify(root)};`);
 vm.createContext(context);vm.runInContext(code+'\nglobalThis.initialize=init;',context);
 return context.initialize(router).then(()=>async function call(route,body={},expected=200){
  let result,status=200;const response={json:value=>result=value,sendStatus:code=>status=code,status:code=>{status=code;return response}};
  if(route==='/next')clock+=1000;
  await routes[route]({body,headers:{authorization:'Bearer test-only'}},response);assert.equal(status,expected,route+' HTTP '+status);return result;
 });
}
(async()=>{
 ({nextJob}=await import('./tavern-plugin/queue-policy.mjs'));
 let call=await load();
 await call('/submit',{id:'wechat:test',text:'hello',requireReceipt:true});
 assert.equal((await call('/next')).job.id,'wechat:test');
 await call('/complete',{id:'wechat:test',text:'raw reply'});
 await call('/delivery',{id:'wechat:test',delivered:true,text:'formatted reply'});
 await call('/delivery',{id:'wechat:test',delivered:true,text:'formatted reply'});
 const observed=(await call('/next')).job;assert.equal(observed.kind,'observation');assert.equal(observed.text,'formatted reply');assert.equal(observed.chatFile,'private-a');
 call=await load();assert.equal((await call('/next')).job.id,observed.id,'safe observation must recover after restart');
 await call('/complete',{id:observed.id,text:observed.text});assert.equal((await call('/next')).job,null,'ack retries must not duplicate history');
 await call('/submit',{id:'wechat:receipt-first',text:'first',requireReceipt:true});
 await call('/submit',{id:'wechat:receipt-second',text:'correction',requireReceipt:true});
 assert.equal((await call('/next')).job.id,'wechat:receipt-first');
 await call('/complete',{id:'wechat:receipt-first',text:'not sent yet'});
 assert.equal((await call('/next')).job,null,'next reply must await delivery outcome');
 await call('/delivery',{id:'wechat:receipt-first',delivered:false});
 assert.equal((await call('/next')).job.id,'wechat:receipt-second');
 await call('/complete',{id:'wechat:receipt-second',text:'correction reply'});
 await call('/delivery',{id:'wechat:receipt-second',delivered:false});
 await call('/submit',{id:'wechat:unknown',text:'maybe'});await call('/next');call=await load();
 assert.equal((await call('/result',{id:'wechat:unknown'})).state,'uncertain');assert.equal((await call('/next')).job,null,'unknown generation must never replay automatically');
 await call('/submit',{id:'runtime:earlier',text:'',kind:'runtime:test'});
 await call('/submit',{id:'wechat:later',text:'real input'});
 assert.equal((await call('/next')).job.id,'wechat:later','real incoming must precede proactive events');
 await call('/complete',{id:'wechat:later',text:'done'});
 assert.equal((await call('/next')).job.id,'runtime:earlier');
 await call('/complete',{id:'runtime:earlier',text:'done'});
 const incoming=path.join(root,'runtime/media/private/incoming');fs.mkdirSync(incoming,{recursive:true});
 const event='actual-image-event',raw=Buffer.from([255,216,255,217]);
 const preview=path.join(incoming,crypto.createHash('sha256').update(event).digest('hex')+'.vision.jpg');
 const metadata={event_id:event,chat_id:'wxid_owner',sender_id:'wxid_owner',sha256:crypto.createHash('sha256').update(raw).digest('hex')};
 fs.writeFileSync(preview,raw);fs.writeFileSync(preview.replace(/\.jpg$/,'.json'),JSON.stringify(metadata));
 await call('/submit',{id:'wechat:visual',text:'image',visualEvent:event});await call('/next');
 await call('/dsh-generate',{job_id:'wechat:visual',history:[]},409);
 assert.equal((await call('/visual',{job_id:'wechat:visual'})).image,'data:image/jpeg;base64,'+raw.toString('base64'));
 fs.writeFileSync(preview,Buffer.from([255,216,0,0]));
 assert.equal((await call('/visual',{job_id:'wechat:visual'})).image,null,'changed bytes must be rejected');
 fs.writeFileSync(preview,raw);metadata.sender_id='different-user';fs.writeFileSync(preview.replace(/\.jpg$/,'.json'),JSON.stringify(metadata));
 assert.equal((await call('/visual',{job_id:'wechat:visual'})).image,null,'another sender cannot supply owner preview');
 const configPath=path.join(root,'local/tavern.json');
 const cfg=JSON.parse(fs.readFileSync(configPath,'utf8'));cfg.generation_backends={private:'dsh'};
 fs.writeFileSync(configPath,JSON.stringify(cfg));
 for(const [id,extra,expected] of [
  ['wechat:private-dsh',{requireReceipt:true},'dsh'],
  ['wechat:no-receipt',{},'tavern'],
  ['wechat:group',{scope:'group',requireReceipt:true},'tavern'],
  ['runtime:not-real',{requireReceipt:true},'tavern'],
  ['runtime:actual-event',{kind:'runtime:followup'},'dsh'],
  ['wechat:runtime-kind',{requireReceipt:true,kind:'runtime:share'},'tavern'],
  ['eval:explicit-tavern',{evaluationSession:'isolated'},'tavern'],
 ]){
  await call('/submit',{id,text:'routing test',...extra});
  assert.equal((await call('/result',{id})).engine,expected,id);
 }
 await call('/media',{job_id:'wechat:group',kind:'tts',text:'no'},403);
 await call('/media',{job_id:'eval:explicit-tavern',kind:'tts',text:'no'},403);
 await call('/moments',{job_id:'wechat:group',limit:5},403);
 await call('/moments',{job_id:'eval:explicit-tavern',limit:5},403);
 await call('/recovery-status',{job_id:'wechat:group'},403);
 await call('/recovery-status',{job_id:'runtime:actual-event'},403);
 console.log('Durable receipt, correct destination, dedupe and restart checks passed');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>fs.rmSync(root,{recursive:true,force:true}));
