const fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'whale-autonomy-'));
try {
 for(const folder of ['runtime','local'])fs.mkdirSync(path.join(root,folder));
 const job={id:'runtime:fixture',kind:'runtime:own research',scope:'private',avatar:'A.png',state:'running',turnContext:'{}'};
 fs.writeFileSync(path.join(root,'local/tavern.json'),JSON.stringify({roles:{private:{avatar:'A.png'}}}));
 fs.writeFileSync(path.join(root,'runtime/tavern-jobs.json'),JSON.stringify({[job.id]:job}));
 const input=path.join(root,'input.json');fs.writeFileSync(input,JSON.stringify({job,history:[],memories:[]}));
 const context={fs,path,defineTool:x=>x,AbortSignal,Date};vm.createContext(context);
 const code=fs.readFileSync('integration/dsh-wechat-context/index.mjs','utf8').replace(/^import[^\n]+\n/gm,'').replace(/export /g,'');
 vm.runInContext(code+'\nglobalThis.initialize=apply;',context);
 assert.throws(()=>context.initialize({systemPrompt:{section(){}},tools:{register(){}}},{root,input}),/require native tool/);
 const guards=[];
 context.initialize({systemPrompt:{section(){}},tools:{register(){},guard:x=>guards.push(x)}},{root,input});
 for(const name of ['web_search','web_fetch','recent_interests','conversation_history','companion_followup','prepare_reply'])assert.equal(guards[0]({name}),undefined,name);
 for(const name of ['pwsh','write_file','subagent','send_media','send_sticker','reminder','draw_image','character_memory'])assert(guards[0]({name}),name);
 fs.writeFileSync(input,JSON.stringify({job,history:[],memories:[],autonomyAuthorized:true}));
 const enabledGuards=[];
 context.initialize({systemPrompt:{section(){}},tools:{register(){},guard:x=>enabledGuards.push(x)}},{root,input});
 for(const name of ['pwsh','write_file','subagent','send_media','send_sticker','draw_image','synthesize_speech'])assert.equal(enabledGuards[0]({name}),undefined,name);
 console.log('PASS autonomous public research and plans allowed; direct sends, owner facts and host mutation blocked');
} finally {fs.rmSync(root,{recursive:true,force:true});}
