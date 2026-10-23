import fs from 'node:fs';import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';import {z} from 'zod';
const server=new McpServer({name:'wechat_core',version:'1.0.0'});
const base={peer:z.string(),token:z.string()};
function tool(name,action,description,extra={}){server.tool(name,description,{...base,...extra},async args=>{try{
 const cfg=JSON.parse(fs.readFileSync(new URL('../config.json',import.meta.url),'utf8'));
 const r=await fetch(`http://127.0.0.1:${cfg.consolePort||3100}/api/wechat-core/tool`,{method:'POST',headers:{'Content-Type':'application/json','x-console-token':cfg.consoleToken,'x-wechat-token':args.token},body:JSON.stringify({action,...args}),signal:AbortSignal.timeout(25000)});
 const value=await r.json();if(!r.ok||value.ok===false)throw Error(value.error||'WeChat core rejected');return {content:[{type:'text',text:JSON.stringify(value)}]};
}catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}});}
tool('wechat_get_context','context','Read this WeChat conversation only, including unread messages and actual delivery states.');
tool('wechat_send','send','Queue one text bubble to this WeChat conversation. Keep id stable for the same intended message. queued is not delivered; native_confirmed is client acceptance, not read receipt.',{id:z.string().min(1).max(120),text:z.string().min(1).max(16000)});
tool('wechat_mark_read','read','Acknowledge through an actually observed sequence, without sending a message.',{through:z.number().int().min(0)});
tool('wechat_wait','wait','Wait briefly for more messages in this conversation; returns updated context. No messages are sent.',{ms:z.number().min(100).max(20000)});
tool('wechat_sleep','sleep','Schedule a later check, 30 seconds to 1 hour. No need to schedule if the conversation has ended. New messages wake you automatically.',{ms:z.number().min(30000).max(3600000)});
tool('wechat_media_list','media-list','List allowed sticker ids and default voice. Use sparingly.');
tool('wechat_voice_generate','voice-generate','Generate speech to send HERE on WeChat as a playable audio file. Available to whitelisted friends and owner. Then poll wechat_media_status(kind=voice,resource=job.id), and call wechat_media_send when completed. Not a native voice bubble. Never redirect to QQ or claim text-only without trying the tool. Do not resubmit.',{text:z.string().min(1).max(300),voice:z.enum(['cool','gentle','husky']).default('gentle')});
if(!process.argv.includes('--group'))if(!process.argv.includes('--group'))tool('wechat_image_generate','image-generate','Owner-only image creation for this conversation. Poll status; do not resubmit.',{text:z.string().min(1).max(4000),selfPortrait:z.boolean().default(true)});
tool('wechat_media_status','media-status','Check a resource created in this conversation.',{kind:z.enum(['voice','image','sticker']),resource:z.string()});
tool('wechat_media_send','media-send','Queue a ready resource to this conversation. queued is not delivered; do not claim success until context shows native_confirmed.',{kind:z.enum(['voice','image','sticker']),resource:z.string()});
await server.connect(new StdioServerTransport());
