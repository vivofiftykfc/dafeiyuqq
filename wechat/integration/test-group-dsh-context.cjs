const fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'dafeiyu-group-dsh-'));
try{
 for(const folder of ['runtime','local'])fs.mkdirSync(path.join(root,folder));
 const job={id:'eval:group-tools',scope:'group',avatar:'G.png',state:'running',turnContext:'',senderIdentity:{stable_id:'wxid_a',display_name:'阿白',code:'member-fixture',source:'evaluation_fixture'}};
 fs.writeFileSync(path.join(root,'local/tavern.json'),JSON.stringify({roles:{group:{avatar:'G.png'}}}));
 fs.writeFileSync(path.join(root,'runtime/tavern-jobs.json'),JSON.stringify({[job.id]:job}));
 const input=path.join(root,'input.json');fs.writeFileSync(input,JSON.stringify({job,history:[],memories:[]}));
 const tools={},guards=[],sections=[];const context={fs,path,defineTool:x=>x,AbortSignal,Date};vm.createContext(context);
 const code=fs.readFileSync('integration/dsh-wechat-context/index.mjs','utf8').replace(/^import[^\n]+\n/gm,'').replace(/export /g,'');
 vm.runInContext(code+'\nglobalThis.initialize=apply;',context);
 assert.throws(()=>context.initialize({systemPrompt:{section(){}},tools:{register(){}}},{root,input}),/requires native tool/);
 context.initialize({systemPrompt:{section:x=>sections.push(x)},tools:{register:x=>tools[x.name]=x,guard:x=>guards.push(x)}},{root,input});
 for(const allowed of ['prepare_reply','sticker_inventory','send_sticker','read_public_page','read_public_video','read_public_note','conversation_history','character_memory','synthesize_speech','media_inventory','send_media'])assert(tools[allowed],allowed);
 for(const denied of ['draw_image','read_moments','reminder','remember_reply_style','companion_followup','recovery_status','current_character'])assert(!tools[denied],denied);
 const guard=guards[0];
 for(const name of ['bash','pwsh','read_file','write_file','read_image','subagent','goal','reminder','draw_image'])assert(guard({name}),name);
 assert.equal(guard({name:'sticker_inventory'}),undefined);
 assert(sections.find(row=>row.name==='wechat:current-speaker').text().includes('wxid_a'));
 console.log('PASS: DSH group exposes chat tools only, denies host/private tools and requires native execution guards');
}finally{fs.rmSync(root,{recursive:true,force:true})}
