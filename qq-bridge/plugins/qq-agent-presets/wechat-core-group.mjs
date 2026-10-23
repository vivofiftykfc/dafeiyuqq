import fs from 'node:fs';import {publicPersonaProjection} from '../../src/conversation-input.js';
import {registerWechatTools} from './wechat-tools.mjs';
export const name='wechat-core-group';export const inject=['systemPrompt','tools'];
export function apply(ctx){
 const allowed=[...['wechat_get_context','wechat_send','wechat_mark_read','wechat_wait','wechat_sleep','wechat_media_list','wechat_voice_generate','wechat_media_status','wechat_media_send'].map(n=>'mcp__wechat_core__'+n),'mcp__web-search-safe__web_search','mcp__web-search-safe__web_fetch'];
 // Do not allowlist unregistered global MCP names during preset validation.
 // Local WeChat definitions are available immediately; the execution guard
 // rejects every inherited capability outside this channel's allowlist.
 registerWechatTools(ctx,{group:true});
 ctx.tools.restrict({deny:['list_mcp_resources','list_mcp_resource_templates','read_mcp_resource','working_directory']});
 ctx.tools.guard(exec=>allowed.some(n=>n===exec.name||n==='mcp__wechat_core__'+exec.name)?undefined:'WeChat group is limited to its bound conversation tools');
 ctx.effect(()=>ctx.systemPrompt.section({name:'wechat:public-persona',order:0,interpolate:false,text:()=>publicPersonaProjection(fs.readFileSync(new URL('../../state/owner/identity.md',import.meta.url),'utf8'))}),'wechat-core-group');
}
