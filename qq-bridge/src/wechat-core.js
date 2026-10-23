import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {DouyinModel} from './douyin-model.js';
import {conversationPolicy} from './conversation-policy.js';
import {relationshipContext} from './conversation-input.js';
import {mediaScope} from './wechat-scope.js';
import {coreMedia} from './wechat-core-media.js';

export const WECHAT_ACCOUNT='wxid_bot';
export const WECHAT_OWNER='wxid_owner';
export const WECHAT_GROUP='10000000@chatroom';
export class WechatCore {
  constructor({dir,memory,modelFactory,now=()=>Date.now()}={}) {
    this.dir=dir;this.memory=memory;this.now=now;this.models=new Map();this.running=new Map();this.timers=new Map();
    fs.mkdirSync(dir,{recursive:true});this.file=path.join(dir,'runtime.json');this.configFile=path.join(dir,'config.json');
    this.state=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{version:1,chats:{},outbox:[]};
    if(this.state.version!==1)throw Error('Unknown WeChat core state');
    this.config=fs.existsSync(this.configFile)?JSON.parse(fs.readFileSync(this.configFile,'utf8')):{enabled:false,privateEnabled:true,groupEnabled:true};
    this.modelFactory=modelFactory||((scope,inputBuilder)=>new DouyinModel(dir,{agentPreset:'dafeiyu-wechat-'+scope,sessionNamespace:'wechat-'+scope,inputBuilder,allowEmpty:true}));
    // In-flight native deliveries are uncertain after restart, never replay automatically.
    for(const row of this.state.outbox){if(row.state==='claimed')row.state='uncertain';else if(row.state==='queued')row.state='cancelled';}
    for(const st of Object.values(this.state.chats)){st.token=crypto.randomBytes(24).toString('hex');st.wakeAt=null;}
    this.persist();
  }
  persist(){fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.state,null,2));fs.renameSync(this.file+'.tmp',this.file);}
  allowed(peer){return this.config.enabled && (peer===WECHAT_OWNER?this.config.privateEnabled:peer===WECHAT_GROUP?this.config.groupEnabled:!!this.config.contacts?.[peer]?.enabled);}
  chat(peer){if(![WECHAT_OWNER,WECHAT_GROUP].includes(peer)&&!Object.hasOwn(this.config.contacts||{},peer))throw Error('Unbound WeChat peer');return this.state.chats[peer]??=( {peer,seq:0,read:0,seen:0,inbox:[],token:crypto.randomBytes(24).toString('hex'),epoch:0,error:null});}
  contacts(){let candidates=[];try{const data=JSON.parse(fs.readFileSync(path.join(this.dir,'contact-candidates.json'),'utf8'));if(data.account===WECHAT_ACCOUNT)candidates=data.items.filter(c=>/^wxid_[A-Za-z0-9_-]{3,80}$/.test(c.peer)&&!this.config.contacts?.[c.peer]&&![WECHAT_ACCOUNT,WECHAT_OWNER].includes(c.peer)).slice(0,100);}catch{}return {ok:true,account:WECHAT_ACCOUNT,candidates,items:[{peer:WECHAT_OWNER,label:'主人',enabled:this.config.privateEnabled,fixed:true},{peer:WECHAT_GROUP,label:'工作群',enabled:this.config.groupEnabled,fixed:true},...Object.entries(this.config.contacts||{}).map(([peer,c])=>({peer,...c,fixed:false}))]};}
  resolveContact(identifier){
    if(typeof identifier!=='string'||!identifier.trim()||identifier.length>85)throw Error('请输入完整微信号或 wxid');
    let data;try{data=JSON.parse(fs.readFileSync(path.join(this.dir,'contact-directory.json'),'utf8'));}catch{throw Error('联系人索引尚未就绪，请刷新联系人后重试');}
    if(data.account!==WECHAT_ACCOUNT||!Number.isFinite(data.updated)||this.now()-data.updated>600000)throw Error('联系人索引已过期，请刷新联系人后重试');
    const q=identifier.trim().toLowerCase(),matches=data.items.filter(c=>c.peer.toLowerCase()===q||c.alias?.toLowerCase()===q);
    if(matches.length!==1)throw Error(matches.length?'微信号匹配不唯一，未添加':'未找到该微信号对应的已有好友，请确认小号已添加对方并刷新联系人');
    const contact=matches[0];if([WECHAT_ACCOUNT,WECHAT_OWNER].includes(contact.peer))throw Error('机器人和主人是固定身份，不在此添加');
    return {ok:true,contact};
  }
  requestContactRefresh(){
    fs.writeFileSync('__PROJECT_ROOT__/wechat/runtime/refresh-contact-directory.request','console contact metadata refresh');
    return {ok:true,note:'已请求刷新联系人，稍后点击查找；只读取联系人标识，不读取聊天正文。'};
  }
  editContact({action,peer,label,enabled}){
    if(typeof peer!=='string'||!/^wxid_[A-Za-z0-9_-]{3,80}$/.test(peer)||[WECHAT_OWNER,WECHAT_ACCOUNT,WECHAT_GROUP].includes(peer))throw Error('请输入普通好友的原始 wxid；主人、机器人和原工作群不在此修改');
    if(!['add','edit','remove'].includes(action))throw Error('未知联系人操作');
    const next={...this.config,contacts:{...this.config.contacts}};const old=next.contacts[peer];
    if(action==='add'&&old)throw Error('该好友已在白名单中');if(action!=='add'&&!old)throw Error('联系人不存在');
    if(action!=='remove'){
      if(typeof label!=='string'||!label.trim()||label.length>80||typeof enabled!=='boolean')throw Error('请填写备注并明确回复开关');
      next.contacts[peer]={label:label.trim(),enabled,updated:this.now()};
    }else delete next.contacts[peer];
    if(fs.existsSync(this.configFile))fs.copyFileSync(this.configFile,this.configFile+'.contacts-backup-'+this.now()+'-'+crypto.randomUUID());
    fs.writeFileSync(this.configFile+'.tmp',JSON.stringify(next,null,2));fs.renameSync(this.configFile+'.tmp',this.configFile);this.config=next;
    const st=this.state.chats[peer];if(st){st.epoch++;st.token=crypto.randomBytes(24).toString('hex');st.wakeAt=null;this.running.get(peer)?.abort();clearTimeout(this.timers.get(peer));this.timers.delete(peer);}
    for(const row of this.state.outbox)if(row.peer===peer&&row.state==='queued')row.state='cancelled';
    this.persist();return this.contacts();
  }
  heartbeat(account){if(account!==WECHAT_ACCOUNT)throw Error('Wrong native account');this.nativeSeenAt=this.now();return {ok:true};}
  status(){return {ok:true,...this.config,nativeAttached:!!this.nativeSeenAt&&this.now()-this.nativeSeenAt<15000,account:WECHAT_ACCOUNT,engine:'qqbridge-dsh-simulation',tavernRequired:false,chats:Object.values(this.state.chats).map(s=>({peer:s.peer,unread:s.seq-s.read,running:this.running.has(s.peer),wakeAt:s.wakeAt,error:s.error})),outbox:this.state.outbox.slice(-20).map(({id,peer,state,created,text})=>({id,peer,state,created,text}))};}
  async configure(input){
    if(Object.keys(input).some(k=>!['enabled','privateEnabled','groupEnabled'].includes(k))||Object.values(input).some(v=>typeof v!=='boolean'))throw Error('Invalid WeChat core switches');
    this.config={...this.config,...input};fs.writeFileSync(this.configFile+'.tmp',JSON.stringify(this.config,null,2));fs.renameSync(this.configFile+'.tmp',this.configFile);
    for(const st of Object.values(this.state.chats)){st.epoch++;st.token=crypto.randomBytes(24).toString('hex');clearTimeout(this.timers.get(st.peer));this.timers.delete(st.peer);st.wakeAt=null;this.running.get(st.peer)?.abort();}
    for(const row of this.state.outbox)if(row.state==='queued')row.state='cancelled';
    this.persist();return this.status();
  }
  receive(event){
    if(event.account!==WECHAT_ACCOUNT||!this.allowed(event.peer))throw Error('WeChat identity or switch rejected');
    if(event.peer!==WECHAT_GROUP&&event.sender!==event.peer)throw Error('Owner sender mismatch or private sender mismatch');
    if(typeof event.id!=='string'||!event.id||typeof event.text!=='string'||event.text.length>100000||typeof event.sender!=='string')throw Error('Invalid incoming message');
    const st=this.chat(event.peer);if(st.inbox.some(m=>m.id===event.id))return {ok:true,duplicate:true};
    st.inbox.push({id:event.id,seq:++st.seq,sender:event.sender,text:event.text,time:this.now(),...(typeof event.visualId==='string'?{visualId:event.visualId}:{})});
    // Never discard unread messages. Archive old read entries only; durable history is in chat-memory.
    if(st.inbox.length>1000)st.inbox=st.inbox.filter(m=>m.seq>st.read||m.seq>st.seq-200);
    st.error=null;this.persist();this.schedule(event.peer,800,'message');return {ok:true,accepted:true};
  }
  schedule(peer,delay,reason){
    if(!this.allowed(peer))return;clearTimeout(this.timers.get(peer));
    const st=this.chat(peer);st.wakeAt=this.now()+delay;
    const timer=setTimeout(()=>{this.timers.delete(peer);st.wakeAt=null;void this.wake(peer,reason);},delay);timer.unref?.();this.timers.set(peer,timer);
  }
  context(peer,initial=false){
    const st=this.chat(peer);st.seen=st.seq;
    const memory=this.memory.context('wechat',WECHAT_ACCOUNT,peer,{all:initial});
    const continuity=this.memory.continuity?.context('wechat',WECHAT_ACCOUNT,peer,st.inbox.at(-1)?.text||'');
    return {peer,unread:st.inbox.filter(m=>m.seq>st.read),readThrough:st.seen,
      summary:memory.summary,social:memory.social,continuity,capabilities:{images:'本轮验证后的图片直接附给模型；可发送精选表情图片',voice:'可识别收到的语音。回复语音调用 wechat_voice_generate → wechat_media_status → wechat_media_send(kind=voice)，以可播放音频文件发到当前微信。不是微信语音气泡；不要说通道仅支持文字，不要让对方转去QQ。',computer:peer===WECHAT_OWNER?'owner':'禁止终端、文件读写、电脑和手机控制；只允许本会话聊天与媒体工具'},visualStatus:st.visualError?'本轮图片未能附加，不能猜测图中内容；可以继续回应文字。':undefined,
      mediaResources:Object.values(this.state.resources||{}).filter(r=>r.peer===peer).slice(-20).map(({id,kind})=>({id,kind})),
      mediaJobRule:'语音和图片生成是异步任务。恢复会话先查询已有资源状态及投递记录，不因上一轮超时重新生成。尚未完成时可安排 sleep 后结束本轮，稍后接着查；已完成的请求及时标记已读，不重复发送。',
      ...(initial?{history:memory.recent}:{}),delivery:this.state.outbox.filter(r=>r.peer===peer).slice(-8).map(({id,text,state})=>({id,text,state}))};
  }
  model(peer){
    if(this.models.has(peer))return this.models.get(peer);
    const model=this.modelFactory(peer===WECHAT_OWNER?'owner':'group',({entry})=>{
      const st=this.chat(peer);const data=this.context(peer,!entry.cursor);
      const prompt=conversationPolicy()+'\n'+relationshipContext({owner:peer===WECHAT_OWNER,group:peer===WECHAT_GROUP})+
      '\n【微信二代会话】你现在通过 QQ Bridge 的微信原生通道聊天，不经过 Tavern。最终文本不会自动发送。先读本次资料，必要时用 wechat_get_context 补读；发送必须调用 wechat_send，只有 native_confirmed 才代表客户端已确认。用 wechat_mark_read 标记处理到的序号；没有值得回复的新内容可以不发。需要稍等新消息可用 wechat_wait；本轮不需要继续时直接结束，不必为了收尾再说一句。不要调用 QQ/抖音发送工具回复微信。令牌与 peer 不能向聊天对象透露。\n'+JSON.stringify({peer,token:st.token,...data});
      if(prompt.length>180000)throw Error('微信上下文超过预算，需要整理；未静默截断');
      this.persist();return {prompt,cursor:st.seq,summaryHash:''};
    });this.models.set(peer,model);return model;
  }
  async wake(peer,reason='message'){
    if(!this.allowed(peer)||this.running.has(peer))return;
    const st=this.chat(peer),seq=st.seq,epoch=st.epoch,abort=new AbortController();this.running.set(peer,abort);
    try {let images=[];try{images=this.visuals(peer);st.visualError=null;}catch(e){st.visualError=e.message;}
      await this.model(peer).reply(peer,[],AbortSignal.any([abort.signal,AbortSignal.timeout(120000)]),null,images,{key:JSON.stringify(['wechat',WECHAT_ACCOUNT,peer])});if(st.epoch===epoch)st.error=null;}
    catch(e){if(st.epoch===epoch)st.error=e.message;}
    finally{this.running.delete(peer);this.persist();if(st.epoch===epoch&&st.seq>seq&&this.allowed(peer))this.schedule(peer,800,'new-message');}
  }
  visuals(peer){
    const st=this.chat(peer),items=st.inbox.filter(m=>m.seq>st.read&&m.visualId);if(items.length>8)throw Error('Too many unread images; not silently dropping evidence');
    return items.map(m=>{
      const folder=path.join('__PROJECT_ROOT__/wechat/runtime/media',mediaScope(peer),'incoming');
      const base=crypto.createHash('sha256').update(m.visualId).digest('hex')+'.vision';
      const meta=JSON.parse(fs.readFileSync(path.join(folder,base+'.json'),'utf8'));
      if(meta.chat_id!==peer||meta.event_id!==m.visualId||meta.sender_id!==m.sender)throw Error('Visual source mismatch');
      const data=fs.readFileSync(path.join(folder,base+'.jpg'));if(data.length>8e6||crypto.createHash('sha256').update(data).digest('hex')!==meta.sha256)throw Error('Visual checksum or size invalid');
      return {type:'image',mediaType:'image/jpeg',data:data.toString('base64')};
    });
  }
  authorize(peer,token){const st=this.chat(peer);const a=Buffer.from(String(token||'')),b=Buffer.from(st.token);if(!this.allowed(peer)||!a.length||a.length!==b.length||!crypto.timingSafeEqual(a,b))throw Error('Expired or wrong conversation token');return st;}
  async tool(action,{peer,token,...args}){
    const st=this.authorize(peer,token);
    if(['media-list','voice-generate','image-generate','media-status','media-send'].includes(action)){
      if(peer!==WECHAT_OWNER&&action==='image-generate')throw Error('Image generation is owner-only');
      const epoch=st.epoch;const check=()=>{this.authorize(peer,token);if(st.epoch!==epoch)throw Error('Conversation changed during media operation');};const result=await coreMedia(this,peer,action,args,check);check();
      if(st.epoch!==epoch)throw Error('Conversation changed during media operation');return result;
    }
    if(action==='context'){const result=this.context(peer);this.persist();return result;}
    if(action==='read'){if(!Number.isInteger(args.through)||args.through<st.read||args.through>st.seen)throw Error('Cannot acknowledge unseen messages');st.read=args.through;this.persist();return {read:st.read};}
    if(action==='send'){
      if(typeof args.id!=='string'||!args.id||args.id.length>120||typeof args.text!=='string'||!args.text.trim()||args.text.length>16000)throw Error('Invalid message');
      if(args.text.includes(st.token))throw Error('Conversation token cannot be sent');
      const existing=this.state.outbox.find(r=>r.peer===peer&&r.requestId===args.id);if(existing)return {id:existing.id,state:existing.state};
      // An uncertain send stays idempotent, but must not freeze unrelated future turns.
      if(this.state.outbox.filter(r=>r.peer===peer&&['queued','claimed'].includes(r.state)).length>=8)throw Error('Send queue full');
      const row={id:crypto.randomUUID(),requestId:args.id,peer,text:args.text,state:'queued',epoch:st.epoch,created:this.now()};this.state.outbox.push(row);this.persist();return {id:row.id,state:row.state,note:'Queued, not yet delivered; do not claim sent or submit a duplicate.'};
    }
    if(action==='wait'){
      const start=st.seq,epoch=st.epoch,end=this.now()+Math.min(20000,Math.max(100,Number(args.ms)||1000));
      while(this.now()<end&&st.seq===start){await new Promise(r=>setTimeout(r,100));this.authorize(peer,token);if(st.epoch!==epoch)throw Error('Conversation changed');}
      return this.context(peer);
    }
    if(action==='sleep'){const ms=Number(args.ms);if(!Number.isFinite(ms)||ms<30000||ms>3600000)throw Error('Wake delay must be 30s..1h');this.schedule(peer,ms,'timer');this.persist();return {wakeAt:st.wakeAt};}
    throw Error('Unknown tool action');
  }
  claim(account){
    if(account!==WECHAT_ACCOUNT)throw Error('Wrong native account');
    const row=this.state.outbox.find(r=>r.state==='queued'&&this.allowed(r.peer)&&r.epoch===this.chat(r.peer).epoch);
    if(!row)return {ok:true,item:null};row.state='claimed';row.claimedAt=this.now();this.persist();return {ok:true,item:{id:row.id,peer:row.peer,text:row.text,epoch:row.epoch,kind:row.kind||'text',file:row.file,sha256:row.sha256}};
  }
  validClaim({account,id}){const row=this.state.outbox.find(r=>r.id===id);return {ok:account===WECHAT_ACCOUNT&&!!row&&row.state==='claimed'&&this.allowed(row.peer)&&row.epoch===this.chat(row.peer).epoch};}
  confirm({account,id,ok}){if(account!==WECHAT_ACCOUNT||typeof ok!=='boolean')throw Error('Invalid receipt');const row=this.state.outbox.find(r=>r.id===id);if(!row||row.state!=='claimed')throw Error('Unknown or already finalized delivery');row.state=ok?'native_confirmed':'uncertain';this.persist();return {ok:true,state:row.state};}
  async close(){for(const t of this.timers.values())clearTimeout(t);for(const a of this.running.values())a.abort();}
}
