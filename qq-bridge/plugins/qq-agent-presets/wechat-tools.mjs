import fs from 'node:fs';
const string={type:'string'},number={type:'number'};
export function registerWechatTools(ctx,{group=false}={}){
 const definitions=[
 ['wechat_get_context','context','Read unread messages and delivery states for this bound conversation.',{}],
 ['wechat_send','send','Queue one text bubble. Keep id stable on retries; queued is not delivered.',{id:string,text:string}],
 ['wechat_mark_read','read','Mark through an observed sequence as processed.',{through:{type:'integer'}}],
 ['wechat_wait','wait','Wait up to 20 seconds for new messages.',{ms:number}],
 ['wechat_sleep','sleep','Wake after 30 seconds to one hour; optional, not mandatory.',{ms:number}],
 ['wechat_media_list','media-list','List curated stickers and default voice.',{}],
 ['wechat_voice_generate','voice-generate','Generate speech HERE on WeChat as a playable audio file (not a native voice bubble). Poll wechat_media_status then wechat_media_send(kind=voice). Do not redirect to QQ or claim text-only; report actual tool errors. Do not regenerate on retry.',{text:string,voice:{type:'string',enum:['gentle','cool','husky']}}],
 ['wechat_media_status','media-status','Check a generated resource.',{kind:{type:'string',enum:['voice','image','sticker']},resource:string}],
 ['wechat_media_send','media-send','Queue a ready image, sticker or voice file to this conversation. Check actual delivery status.',{kind:{type:'string',enum:['voice','image','sticker']},resource:string}],
 ...(!group?[['wechat_image_generate','image-generate','Generate an image for the owner conversation.',{text:string,selfPortrait:{type:'boolean'}}]]:[])];
 for(const [name,action,extraDescription,extra]of definitions){
  const properties={peer:string,token:string,...extra};
  ctx.tools.register({name,description:extraDescription,parameters:{type:'object',properties,required:Object.keys(properties),additionalProperties:false},output:{schema:{type:'string'},render:(_,value)=>[{type:'text',text:value}]},timeoutMs:28000,
   async execute(args){
    if(typeof args.peer!=='string'||typeof args.token!=='string')throw Error('Missing conversation scope');
    if(group&&args.peer==='wxid_owner')throw Error('Friend tools cannot address owner');
    const cfg=JSON.parse(fs.readFileSync(new URL('../../config.json',import.meta.url),'utf8'));
    const r=await fetch(`http://127.0.0.1:${cfg.consolePort||3100}/api/wechat-core/tool`,{method:'POST',headers:{'content-type':'application/json','x-console-token':cfg.consoleToken,'x-wechat-token':args.token},body:JSON.stringify({...args,action}),signal:AbortSignal.timeout(25000)});
    const result=await r.json();if(!r.ok||result.ok===false)throw Error(result.error||'WeChat tool failed');return JSON.stringify(result);
   }});
 }
}
