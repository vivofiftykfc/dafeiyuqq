const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),vm=require('vm'),assert=require('assert');
(async()=>{
 const {nextJob}=await import('./tavern-plugin/queue-policy.mjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dafeiyu-video-route-'));
 try{
  fs.mkdirSync(path.join(root,'runtime'));fs.mkdirSync(path.join(root,'local'));
  const cfg={roles:{group:{avatar:'G.png',name:'Group',revision:'v1',chatFile:'group'},private:{avatar:'P.png',name:'Private',chatFile:'private'}},generation_backends:{private:'dsh'}};
  const configPath=path.join(root,'local/tavern.json');fs.writeFileSync(configPath,JSON.stringify(cfg));
  fs.writeFileSync(path.join(root,'runtime/owner-ops.json'),JSON.stringify({token:'fixture-secret'}));
  const calls=[];let duringRead=()=>{};
  const ctx={fs,path,crypto,nextJob,express:{json:()=>{}},Buffer,URL,Date,AbortSignal,console,execFile:()=>{},promisify:()=>async()=>({stdout:'{"items":[],"scope":"group","avatar":"G.png"}'}),fetch:async(url,opts)=>{
   calls.push({url,body:JSON.parse(opts.body),headers:opts.headers});duringRead();
   return {ok:true,status:200,json:async()=>({status:'content_read',url:'https://www.bilibili.com/video/BV1abcdefghj',title:'实际视频',content_evidence:'真实抽样内容',watched_entire_video:false})};
  }};
  vm.createContext(ctx);const routes={};
  const code=fs.readFileSync('integration/tavern-plugin/index.mjs','utf8').replace(/^import[^\n]+\n/gm,'').replace(/export /g,'').replace(/const root='[^']+';/,`const root=${JSON.stringify(root)};`);
  vm.runInContext(code+'\nglobalThis.initialize=init;globalThis.readAllowed=publicReadAdmitted;',ctx);
  await ctx.initialize({use:()=>{},post:(name,fn)=>routes[name]=fn,get:()=>{}});
  async function api(route,body={},expected=200,headers={}){let value,status=200;const res={json:x=>value=x,sendStatus:x=>status=x,status:x=>{status=x;return res}};await routes[route]({body,headers},res);assert.equal(status,expected,route);return value}
  await api('/public-video',{job_id:'missing',url:'https://b23.tv/abc'},403);
  await api('/submit',{id:'eval:group-video',scope:'group',text:'怎么看这个视频',evaluationSession:'video',nativeVideo:{status:'content_read',server_id:'123',watched_entire_video:true}},200,{authorization:'Bearer fixture-secret'});
  await api('/submit',{id:'eval:group-video',scope:'group',text:'different',nativeVideo:{server_id:'999'}},200,{authorization:'Bearer fixture-secret'});
  const job=(await api('/next')).job;assert.equal(job.engine,'tavern');assert(ctx.readAllowed(job));
  assert.equal(job.nativeVideo.server_id,'123');assert.equal(job.nativeVideo.watched_entire_video,false,'prefetched native samples are never complete viewing; duplicate submit cannot rewrite the source');
  const result=await api('/public-video',{job_id:job.id,url:'https://b23.tv/abc'});
  assert.equal(result.content_evidence,'真实抽样内容');assert.equal(result.journal_record.reason,'evaluation_excluded');
  assert.equal(calls.length,1);assert.equal(calls[0].url,'http://127.0.0.1:18005/public-video');
  assert.equal(calls[0].body.chat_id,'10000000@chatroom');assert.equal(calls[0].body.sender_id,'scoped-public-reader');
  assert(calls[0].body.timeout_seconds>=5&&calls[0].body.timeout_seconds<=35);
  const journal=await api('/reading-journal',{job_id:job.id});assert.equal(journal.scope,'group');
  duringRead=()=>{cfg.roles.group.revision='v2';fs.writeFileSync(configPath,JSON.stringify(cfg))};
  await api('/public-video',{job_id:job.id,url:'https://b23.tv/abc'},409);
  const count=calls.length;await api('/public-video',{job_id:job.id,url:'https://b23.tv/abc'},403);assert.equal(calls.length,count);
  await api('/reading-journal',{job_id:job.id},403);
  const front={activeJob:{id:'eval:group-video',kind:'chat',engine:'tavern',scope:'group'},context:{registerFunctionTool:t=>front.tool=t},api:async(route,body)=>{front.request={route,body};return {status:'content_read'}}};vm.createContext(front);
  const registration=fs.readFileSync('integration/tavern-extension/index.js','utf8').split('\n').find(line=>line.startsWith("context.registerFunctionTool({name:'read_public_video'"));
  vm.runInContext(registration,front);assert(front.tool.shouldRegister());await front.tool.action({url:'https://b23.tv/abc'});
  assert.equal(front.request.route,'/public-video');assert.equal(front.request.body.job_id,'eval:group-video');
  front.activeJob={engine:'dsh',kind:'chat'};assert(!front.tool.shouldRegister());front.activeJob=null;assert(!front.tool.shouldRegister());
  console.log('PASS: native Tavern video tool, source/role/deadline guards, real group target, post-read role change and isolated journal');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
