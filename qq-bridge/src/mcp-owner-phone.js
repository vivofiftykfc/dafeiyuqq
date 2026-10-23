import fs from 'node:fs';
import path from 'node:path';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {ListToolsRequestSchema,CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {guard,DATA,ROOT} from './owner-services.js';
import {acquirePhone} from './phone-lease.js';
const cfg=JSON.parse(fs.readFileSync(path.join(DATA,'phone.json'),'utf8'));
guard();
const client=new Client({name:'owner-phone-adapter',version:'1.0.0'});
const transport=new StdioClientTransport({command:path.join(ROOT,'../snowluma/node.exe'),args:[path.join(ROOT,'../tutorial-kit/packages/phone-mcp/src/phone-mcp.js')],env:{...process.env,PHONE_ADB:cfg.adb,PHONE_SERIAL:cfg.serial,PHONE_SHOT_DIR:path.join(DATA,'phone-shots'),PHONE_MACRO_FILE:path.join(DATA,'phone-macros.json'),PHONE_FFMPEG:cfg.ffmpeg}});
await client.connect(transport);
const tools=(await client.listTools()).tools.filter(t=>t.name.startsWith('phone_')&&!['phone_pair','phone_connect','phone_macro'].includes(t.name));
const names=new Set(tools.map(t=>t.name));
const auditDir=path.join(DATA,'phone-history');
fs.mkdirSync(auditDir,{recursive:true});
function audit(row){fs.appendFileSync(path.join(auditDir,new Date().toISOString().slice(0,10)+'.jsonl'),JSON.stringify({at:new Date().toISOString(),...row})+'\n');}
const server=new Server({name:'dafeiyu-phone',version:'1.0.0'},{capabilities:{tools:{}}});
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools}));
server.setRequestHandler(CallToolRequestSchema,async({params})=>{
 guard();if(!names.has(params.name))throw Error('Tool not enabled for this USB phone');
 if(params.name==='phone_devices'&&params.arguments?.use&&params.arguments.use!==cfg.serial)throw Error('This adapter is bound to the owner-authorized USB phone');
 const id=crypto.randomUUID();
 const args={...(params.arguments||{})};
 // Record actions, but never retain text typed into potentially private input fields.
 if(params.name==='phone_text'&&args.text)args.text=`[input omitted: ${args.text.length} characters]`;
 audit({id,phase:'requested',tool:params.name,args});
 const release=acquirePhone(DATA,'大肥鱼手机工具');
 try{
  let result=await client.callTool({name:params.name,arguments:params.arguments||{}},undefined,{timeout:90000});
  if(params.name==='phone_open_app'&&!result.isError&&['com.ss.android.ugc.aweme','com.zhihu.android'].includes(params.arguments?.pkg)){
   // Apps may restore a private inbox. Navigate to the public home tab before returning control.
   const home=await client.callTool({name:'phone_tap_text',arguments:{text:'首页',index:0}},undefined,{timeout:45000});
   audit({id,phase:'public_home_navigation',tool:'phone_tap_text',isError:!!home.isError,content:home.content});
   result={...result,content:[...result.content,{type:'text',text:home.isError?'未能确认已回公开首页；先只导航到首页，不阅读消息/个人页，不把恢复的私人页面当公开素材。':'已点击公开首页入口；继续确认实际页面，禁止阅读消息和私人资料。'}]};
  }
  audit({id,phase:'result',tool:params.name,isError:!!result.isError,content:params.name==='phone_text'?[{type:'text',text:'Input result omitted for privacy; inspect screen to verify'}]:result.content?.map(c=>c.type==='image'?{type:'image',mimeType:c.mimeType,savedByScreenshotTool:true}:c)});
  return result;
 }catch(e){audit({id,phase:'error',tool:params.name,error:String(e.message)});throw e;}
 finally {release();}
});
server.onclose=()=>{client.close().catch(()=>{});};
await server.connect(new StdioServerTransport());
