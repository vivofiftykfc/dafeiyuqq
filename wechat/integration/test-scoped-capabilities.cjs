const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),vm=require('vm'),assert=require('assert');
(async()=>{
 const {nextJob}=await import('./tavern-plugin/queue-policy.mjs');
 const {speakerIdentity}=await import('./tavern-plugin/speaker-identity.mjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dafeiyu-capabilities-'));
 try{
  fs.mkdirSync(path.join(root,'runtime'));fs.mkdirSync(path.join(root,'local'));
  const cfg={evaluation_backend:'dsh',roles:{private:{avatar:'P.png',name:'Private',chatFile:'private'},group:{avatar:'G.png',name:'Group',chatFile:'group'}},generation_backends:{private:'dsh'},dsh_models:{private:{text:'deepseek-v4-pro',image:'deepseek-flash'}}};
  const configPath=path.join(root,'local/tavern.json');fs.writeFileSync(configPath,JSON.stringify(cfg));
  fs.writeFileSync(path.join(root,'runtime/owner-ops.json'),JSON.stringify({token:'fixture'}));
  const settings={main_api:'openai',oai_settings:{chat_completion_source:'custom',custom_model:'deepseek-flash',custom_url:'https://api.deepseek.com',openai_model:'inactive-gpt4',proxy_password:'never-leak-this'}};
  const fixtureFs=Object.create(fs);fixtureFs.readFileSync=(p,...args)=>p==='data/default-user/settings.json'?JSON.stringify(settings):fs.readFileSync(p,...args);
  const routes={};const ctx={fs:fixtureFs,path,crypto,nextJob,speakerIdentity,express:{json:()=>{}},Buffer,URL,Date,AbortSignal,execFile:()=>{},promisify:()=>{}};vm.createContext(ctx);
  const source=fs.readFileSync('integration/tavern-plugin/index.mjs','utf8').replace(/^import[^\n]+\n/gm,'').replace(/export /g,'').replace(/const root='[^']+';/,`const root=${JSON.stringify(root)};`);
  vm.runInContext(source+'\nglobalThis.initialize=init;globalThis.selectedModel=configuredTavernModel;globalThis.scoped=scopedCapabilities;',ctx);
  await ctx.initialize({use:()=>{},post:(name,fn)=>routes[name]=fn,get:()=>{}});
  async function api(route,body={},expected=200){let value,status=200;const res={json:x=>value=x,sendStatus:x=>status=x,status:x=>{status=x;return res}};await routes[route]({body,headers:{authorization:'Bearer fixture'}},res);assert.equal(status,expected,route);return value}
  await api('/capabilities',{},403);
  await api('/submit',{id:'eval:group',scope:'group',kind:'chat',text:'怎么部署、什么模型？',evaluationSession:'group-isolated'});
  assert.equal((await api('/next')).job.engine,'tavern','group eval must use the real group backend, not the private DSH override');
  const group=await api('/capabilities',{job_id:'eval:group'});
  assert.equal(group.scope,'group');assert.equal(group.generation.configured_model,'deepseek-flash');assert.equal(group.deployment.chat_inference,'remote_DeepSeek_API');assert.equal(group.deployment.wechat_bridge,'owner_local_windows_computer');
  assert(group.unavailable_here.includes('私人提醒任务'));assert(!group.model_tools.some(value=>/remember_reply_style/.test(value)));
  const serialized=JSON.stringify(group);for(const forbidden of ['never-leak-this','inactive-gpt4','D:/Projects','owner-ops.json'])assert(!serialized.includes(forbidden));
  assert.equal(group.execution_this_turn.sticker_sending,false,'evaluation has no send tool');
  assert.equal(group.configured_group_capabilities.role_scoped_group_memory,true,'evaluation restrictions cannot erase real group capability');
  assert.equal(group.owner_private_only.persistent_reminders,true);
  const privateText=ctx.scoped({generation:{},limits:''},{scope:'private',engine:'dsh'},{});
  const privateImage=ctx.scoped({generation:{},limits:''},{scope:'private',engine:'dsh',visualEvent:'verified'},{});
  assert.equal(privateText.generation.configured_model,'deepseek-v4-pro');assert.equal(privateImage.generation.configured_model,'deepseek-flash');
  settings.oai_settings.chat_completion_source='openai';assert.equal(ctx.selectedModel(settings).model,'inactive-gpt4');
  settings.main_api='textgenerationwebui';assert.equal(ctx.selectedModel(settings).model,null,'inactive API settings are not proof of active model');
  cfg.roles.group.avatar='other.png';fs.writeFileSync(configPath,JSON.stringify(cfg));await api('/capabilities',{job_id:'eval:group'},403);
  let registered,request;
  const front={activeJob:{id:'group-source',scope:'group'},context:{registerFunctionTool:tool=>registered=tool},api:async(route,body)=>{request={route,body};return {scope:'group'}}};vm.createContext(front);
  const registration=fs.readFileSync('integration/tavern-extension/index.js','utf8').split('\n').find(line=>line.startsWith("context.registerFunctionTool({name:'capability_status'"));
  vm.runInContext(registration,front);assert(registered.shouldRegister());await registered.action();assert.equal(request.body.job_id,'group-source');assert.equal(request.route,'/capabilities');
  front.activeJob=null;assert.equal(registered.shouldRegister(),false);
  console.log('Scoped model configuration, deployment facts, group permissions, source binding and separate evaluation routes verified');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
