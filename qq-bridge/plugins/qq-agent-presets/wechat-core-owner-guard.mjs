import {registerWechatTools} from './wechat-tools.mjs';
export const name='wechat-core-owner-guard';export const inject=['tools'];
export function apply(ctx){registerWechatTools(ctx);ctx.tools.guard(exec=>{
 if(exec.name.startsWith('mcp__snowluma__')||/voice_send_owner|image_send_owner|sticker_send_owner|discovery_send_owner/.test(exec.name))return 'Current reply channel is WeChat. Use wechat_send for replies; QQ delivery is not part of this conversation.';
});}
