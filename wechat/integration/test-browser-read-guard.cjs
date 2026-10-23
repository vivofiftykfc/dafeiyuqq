const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),assert=require('assert');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'dafeiyu-browser-read-'));
try{
 fs.mkdirSync(path.join(root,'runtime'));fs.mkdirSync(path.join(root,'local'));
 const job={id:'eval:browser',scope:'private',avatar:'whale.png',state:'running',dshDeadline:Date.now()+100000};
 fs.writeFileSync(path.join(root,'runtime/tavern-jobs.json'),JSON.stringify({[job.id]:job}));
 fs.writeFileSync(path.join(root,'local/tavern.json'),JSON.stringify({roles:{private:{avatar:job.avatar}}}));
 const workspace=path.join(root,'workspace'),output=path.join(workspace,'.browser-output');fs.mkdirSync(output,{recursive:true});
 const screenshot=path.join(output,'note.png');fs.writeFileSync(screenshot,'fixture image');
 const outside=path.join(root,'outside.png');fs.writeFileSync(outside,'outside');
 const input=path.join(root,'input.json');fs.writeFileSync(input,JSON.stringify({job,browserReadOnly:true,browserWorkspace:workspace,browserAllowedUrl:'https://www.douyin.com/note/7699513539732230650',history:[]}));
 const context={fs,path,URL,Date,defineTool:x=>x};vm.createContext(context);
 vm.runInContext(fs.readFileSync('integration/dsh-wechat-context/index.mjs','utf8').replace(/^import[^\n]+\n/gm,'').replace(/export /g,'')+'\nglobalThis.initialize=apply;',context);
 let guard,resultHook;context.initialize({on:(name,fn)=>{if(name==='tools/result')resultHook=fn},systemPrompt:{section:()=>{}},tools:{guard:fn=>guard=fn,register:()=>{}}},{root,input});
 assert.equal(guard({name:'browser_navigate',arguments:{url:'https://www.douyin.com/note/7699513539732230650'}}),undefined);
 for(const url of ['http://www.douyin.com/','https://127.0.0.1/','https://www.douyin.com.evil.org/','https://user:secret@www.douyin.com/','file:///C:/secret'])assert(guard({name:'browser_navigate',arguments:{url}}));
 assert.match(guard({name:'browser_navigate',arguments:{url:'https://www.douyin.com/note/7699513539732230651'}}),/Only public/);
 for(const name of ['browser_click','browser_fill_form','browser_evaluate','browser_run_code','execute_command','send_sticker'])assert(guard({name,arguments:{}}));
 assert(guard({name:'read_image',arguments:{file_path:screenshot}}));
 resultHook({name:'browser_take_screenshot',arguments:{filename:'note.png'}},{content:[],isError:false});
 assert.equal(guard({name:'read_image',arguments:{file_path:screenshot}}),undefined);
 const rootScreenshot=path.join(workspace,'root.png');fs.writeFileSync(rootScreenshot,'fixture image');
 resultHook({name:'browser_take_screenshot',arguments:{filename:'root.png'}},{content:[],isError:false});
 assert.equal(guard({name:'read_image',arguments:{file_path:'root.png'}}),undefined);
 for(const file_path of [outside,path.join(output,'../../outside.png'),path.join(output,'missing.png')])assert(guard({name:'read_image',arguments:{file_path}}));
 const large=path.join(output,'large.png');fs.writeFileSync(large,Buffer.alloc(8*1024*1024+1));assert(guard({name:'read_image',arguments:{file_path:large}}));
 const link=path.join(output,'linked.png');fs.linkSync(outside,link); // A hard link resolves in-scope; a symbolic link must not.
 try{const symbolic=path.join(output,'symlink.png');fs.symlinkSync(outside,symbolic);assert(guard({name:'read_image',arguments:{file_path:symbolic}}))}catch(error){if(error.code!=='EPERM')throw error}
 const snapshot=text=>resultHook({name:'mcp__playwright__browser_snapshot'},{content:[{type:'text',text}]});
 const click=target=>guard({name:'browser_click',arguments:{target}});
 for(const text of ['  - generic [ref=heading]: 登录后免费畅享高清视频\n    - generic [ref=close] [cursor=pointer]',
                    '  - generic [ref=heading]: 其他文字\n  - generic [ref=close] [cursor=pointer]']){snapshot(text);assert(click('close'))}
 snapshot('  - generic [ref=heading]: 登录后免费畅享高清视频\n  - generic [ref=close] [cursor=pointer]');
 assert(click('like'));assert.equal(click('close'),undefined);assert(click('close'));
 snapshot('  - generic [ref=heading]: 登录后免费畅享高清视频\n  - generic [ref=close] [cursor=pointer]');
 assert(guard({name:'browser_click',arguments:{target:'close',button:'right'}}));
 assert(guard({name:'browser_click',arguments:{target:'close',doubleClick:true}}));
 assert.equal(guard({name:'mcp__playwright__browser_snapshot',arguments:{}}),undefined);
 assert.equal(guard({name:'browser_take_screenshot',arguments:{filename:'page.png'}}),undefined);
 assert(guard({name:'browser_take_screenshot',arguments:{filename:'../elsewhere.png'}}));
 for(let i=0;i<3;i++)assert.equal(guard({name:'browser_take_screenshot',arguments:{filename:`sample${i}.png`}}),undefined);
 assert(guard({name:'browser_take_screenshot',arguments:{filename:'excess.png'}}));
 assert(guard({name:'browser_wait_for',arguments:{time:60}}));
 assert.equal(guard({name:'browser_press_key',arguments:{key:'Escape'}}),undefined);
 assert(click('close'));
 assert(guard({name:'browser_press_key',arguments:{key:'Enter'}}));
 assert.equal(guard({name:'browser_tabs',arguments:{action:'list'}}),undefined);
 assert(guard({name:'browser_tabs',arguments:{action:'new'}}));
 assert(guard({name:'browser_navigate',arguments:{url:'https://www.douyin.com/note/7699513539732230650'}}));
 fs.writeFileSync(path.join(root,'local/tavern.json'),JSON.stringify({roles:{private:{avatar:'another.png'}}}));
 assert.throws(()=>guard({name:'browser_snapshot',arguments:{}}),/role changed/i);
 console.log('Read-only browser navigation, action denial, output scope and source revocation checks passed');
}finally{fs.rmSync(root,{recursive:true,force:true})}
