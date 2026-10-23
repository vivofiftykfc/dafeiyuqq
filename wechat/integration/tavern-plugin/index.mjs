import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import {nextJob} from './queue-policy.mjs';
import {speakerIdentity} from './speaker-identity.mjs';
export const info={id:'dafeiyu',name:'Dafeiyu adapter',description:'Local durable job queue and existing media-service adapter'};
const root='__PROJECT_ROOT__/wechat';
const statePath=path.join(root,'runtime/tavern-jobs.json');
let jobs=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath,'utf8')):{};
// Never re-run a claimed generation automatically after an unknown shutdown.
for(const j of Object.values(jobs))if(j.state==='running')j.state=j.kind==='observation'?'pending':'uncertain';
let heartbeat=0;
const configPath=path.join(root,'local/tavern.json');
const cardsPath=path.join(root,'runtime/tavern-cards.json');
const config=()=>JSON.parse(fs.readFileSync(configPath,'utf8'));
async function autonomousAllowed(job){
 if(!job||job.scope!=='private'||job.evaluation||job.state!=='running'||!job.kind?.startsWith('runtime:'))return false;
 try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/autonomy_policy.py'),job.id],{timeout:5000,windowsHide:true,maxBuffer:1000});return JSON.parse(stdout).allowed===true;}catch{return false}
}
const cards=()=>fs.existsSync(cardsPath)?JSON.parse(fs.readFileSync(cardsPath,'utf8')):[];
function momentsReady(){try{return JSON.parse(fs.readFileSync(path.join(root,'runtime/wechat-social-index-status.json'),'utf8')).state==='ready'}catch{return false}}
function choose(scope){return config().roles?.[scope]||{avatar:scope==='private'?'小鲸鱼私聊.png':'小鲸鱼群聊测试.png',name:'小鲸鱼'}}
function dshAdmitted(job){
 if(!job||job.state!=='running'||job.engine!=='dsh'||!(job.kind==='chat'||job.kind.startsWith('runtime:'))||choose(job.scope).avatar!==job.avatar||(choose(job.scope).revision||null)!==(job.roleRevision||null))return false;
 return job.evaluation===true||(['private','group'].includes(job.scope)&&config().generation_backends?.[job.scope]==='dsh'&&((job.kind==='chat'&&job.requireReceipt===true&&job.id.startsWith('wechat:'))||(job.kind.startsWith('runtime:')&&job.id.startsWith('runtime:')))&&job.chatFile===choose(job.scope).chatFile);
}
function publicReadAdmitted(job){
 if(!job||job.state!=='running'||!['private','group'].includes(job.scope)||!['tavern','dsh'].includes(job.engine)||!(job.kind==='chat'||job.kind?.startsWith('runtime:')))return false;
 const role=choose(job.scope),deadline=job.dshDeadline||((job.started||job.created||0)+110000);
 if(role.avatar!==job.avatar||(role.revision||null)!==(job.roleRevision||null)||Date.now()>=deadline)return false;
 if(job.evaluation)return true;
 return job.chatFile===(role.chatFile||'wechat-'+job.scope)&&((job.kind==='chat'&&job.requireReceipt===true&&job.id.startsWith('wechat:'))||(job.kind.startsWith('runtime:')&&job.id.startsWith('runtime:')));
}
async function recordReading(job,kind,evidence){
 if(job.evaluation)return {stored:false,reason:'evaluation_excluded'};
 const payload={url:evidence.url,title:evidence.title,text_truncated:evidence.text_truncated,reading_status:evidence.reading_status,limitations:evidence.limitations,coverage:evidence.coverage};
 const field=kind==='webpage'?'text':'content_evidence';payload[field]=String(evidence[field]||'').slice(0,9000);
 if(kind==='webpage'&&String(evidence.text||'').length>9000)payload.text_truncated=true;
 try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/reading_journal.py'),JSON.stringify({operation:'record',job_id:job.id,kind,evidence:payload})],{timeout:3000,windowsHide:true,maxBuffer:12000});return JSON.parse(stdout);}
 catch{console.warn('Reading journal unavailable; original content read remains usable');return {stored:false,reason:'journal_unavailable'}}
}
function generationEngine({scope,kind,evaluationSession,id,requireReceipt}){
 if(!(kind==='chat'||kind.startsWith('runtime:')))return 'tavern';
 if(evaluationSession)return (config().evaluation_backends?.[scope]||(scope==='group'?'tavern':config().evaluation_backend))==='dsh'?'dsh':'tavern';
 return ['private','group'].includes(scope)&&((kind==='chat'&&requireReceipt===true&&id.startsWith('wechat:'))||(kind.startsWith('runtime:')&&id.startsWith('runtime:')))&&config().generation_backends?.[scope]==='dsh'?'dsh':'tavern';
}

function configuredTavernModel(settings){
 if(settings?.main_api!=='openai')return {model:null,source:'unsupported_saved_provider'};
 const selected=settings.oai_settings||{};
 const fields={custom:'custom_model',openai:'openai_model',deepseek:'deepseek_model',openrouter:'openrouter_model',claude:'claude_model',makersuite:'google_model'};
 const field=fields[selected.chat_completion_source],value=field?selected[field]:null;
 let inference='provider_endpoint_location_unverified';
 if(selected.chat_completion_source==='custom')try{const host=new URL(selected.custom_url).hostname;inference=host==='api.deepseek.com'?'remote_DeepSeek_API':['localhost','127.0.0.1','[::1]'].includes(host)?'local_endpoint_backing_model_unverified':'custom_endpoint_backing_model_unverified'}catch{}
 return {model:typeof value==='string'&&value.trim()?value.trim().slice(0,160):null,provider:selected.chat_completion_source||null,inference,source:'dedicated_tavern_saved_active_provider_configuration',server_model_attestation:false};
}
function scopedCapabilities(raw,job,tavernModel){
 const dsh=job.engine==='dsh',privateChat=job.scope==='private';
 const model=dsh?{model:config().dsh_models?.[job.scope]?.[job.visualEvent?'image':'text']||'deepseek-flash',provider:'deepseek-account',inference:'remote_DeepSeek_account',source:job.visualEvent?'current_scope_DSH_image_configuration':'current_scope_DSH_text_configuration',server_model_attestation:false}:tavernModel;
 const generation={...raw.generation,configured_model:model.model,configuration_source:model.source,provider:model.provider,server_model_attestation:false};
 generation.runtime_entry=dsh?'DSH SDK stdio':'SillyTavern model generation';generation.custom_tavern_model_api_used_for_reply=!dsh;
 if(model.model==='deepseek-flash'){generation.configured_model_label='DeepSeek V4.1 Flash';generation.model_alias_reference='https://www.deepseek.com/news/deepseek-v4-1-flash/'}
 const deployment={wechat_bridge:'owner_local_windows_computer',dialogue_service:'owner_local_dedicated_SillyTavern',chat_inference:model.inference||'unverified',local_image_generation:'local_ComfyUI',local_speech_synthesis:'local_offline_TTS',meaning:'桥接和酒馆部署在主人的电脑；聊天模型的API位置见chat_inference。本地部署服务与本地运行聊天模型不是一回事；没有真实生活/外出经历。'};
 const nativeVideo={source:'bound alt conversation and original sender; exact quote server ID or one actual mentioned member latest video',reads_before_generation:true,cached_MP4_only:true,automatic_remote_attachment_download:false,meaning:'微信视频文件不是网页链接；已定位但尚未下载时，不说空引用或索要网页链接。仅本机已缓存且消息哈希核对成功的视频可读画面与音轨采样。'};
 if(privateChat)return {...raw,scope:'private',generation,deployment,native_wechat_video:nativeVideo,limits:raw.limits+' 当前描述仅适用于此私聊；群聊能力另查当前群聊任务。'};
 return {scope:'group',generation:{current:raw.generation.current,configured_model:model.model,configured_model_label:generation.configured_model_label,model_alias_reference:generation.model_alias_reference,provider:model.provider,configuration_source:model.source,runtime_entry:generation.runtime_entry,custom_tavern_model_api_used_for_reply:generation.custom_tavern_model_api_used_for_reply,server_model_attestation:false},deployment,
  configured_group_capabilities:{chat:true,image_understanding:true,shared_sticker_inventory:true,sticker_sending:true,local_TTS:true,audio_file_sending:true,video_file_sending:true,image_file_sending:true,public_web_search:true,public_links:true,public_bilibili_content_read:true,cached_native_wechat_video:true,role_scoped_reading_journal:true,role_scoped_group_history:true,role_scoped_group_memory:true},
  native_wechat_video:nativeVideo,
  media_files:{tools:['synthesize_speech','media_inventory','send_media'],scope:'current conversation generated media only',delivery:'native file attachment, not a native voice bubble; acceptance is not a read receipt',one_file_per_turn:true},
  execution_this_turn:{evaluation:job.evaluation===true,sticker_sending:!job.evaluation,media_file_sending:!job.evaluation,local_TTS:!job.evaluation,history_lookup:!job.evaluation,memory_writes:!job.evaluation,meaning:'隔离验收禁用写操作和真实聊天查询，不表示正式群聊没有记忆功能'},
  owner_private_only:{persistent_reminders:true,cached_moments_read:raw.moments.read_available,file_operations:true,bounded_companion_followup:true,meaning:'这些在绑定主人私聊中可用，不向普通群友开放，也不能替群友读取其朋友圈；朋友圈读取只是本机小号缓存，不是刷新或发布'},
  model_tools:[...(raw.model_tools||[]).filter(value=>!/^remember_reply_style\b/.test(value)&&(!job.evaluation||!/^(send_sticker|conversation_history|character_memory)\b/.test(value))),...(!dsh?['read_public_video reads bounded public Bilibili subtitles, sampled frames or audio; never a full-watch guarantee','recent_interests recalls only current-role, current-scope actual readings; no test reads']:[])],
  owner_only_group_commands:{drawing:'绑定主人在群里@后明确要求画图，由桥接入口执行；群聊模型没有draw_image函数，普通群友不能触发',sharing_controls:'绑定主人可以手动分享热点和控制本群日常分享',role_selection:'绑定主人可用/角色为此群独立选择角色'},
  unavailable_here:['私人提醒任务','私聊主动陪伴','本机文件与命令执行','个人朋友圈读取','保存私聊格式偏好',...(!dsh?['DSH专用read_public_note函数']:[])],
  not_connected:['微信原生语音气泡发送','朋友圈发布、点赞、评论及主动刷新'],
  limits:'这是当前群聊的实际能力，不能把主人私聊的工具说成群友可调用；图片以已解析证据为准，执行以回执为准。模型名为当前保存配置，不是服务端底层权重的证明。'};
}
function save(){const tmp=statePath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(jobs));fs.renameSync(tmp,statePath)}
function observation(job,text,source,media=false){
 const id='observation:'+crypto.createHash('sha256').update(source).digest('hex').slice(0,32);
 if(!jobs[id])jobs[id]={id,source,text,scope:job.scope,avatar:job.avatar,character:job.character,chatFile:job.chatFile,kind:'observation',media,state:'pending',created:Date.now()};
 return id;
}
function importObservations(){
 const folder=path.join(root,'runtime/tavern-observations');if(!fs.existsSync(folder))return;
 for(const filename of fs.readdirSync(folder).filter(x=>x.endsWith('.json'))){
  const file=path.join(folder,filename);const row=JSON.parse(fs.readFileSync(file,'utf8'));
  if(row.state!=='pending')continue;
  if(!jobs[row.id])jobs[row.id]={...row,kind:'observation',state:'pending'};
  save();row.state='enqueued';fs.writeFileSync(file,JSON.stringify(row));
 }
}
function auth(req){
 const token=JSON.parse(fs.readFileSync(path.join(root,'runtime/owner-ops.json'),'utf8')).token;
 const a=Buffer.from(req.headers.authorization||'');const b=Buffer.from('Bearer '+token);
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export async function init(router){
 router.use(express.json({limit:'256kb'}));
 save();
 router.post('/reply-style',(req,res)=>{
  const job=jobs[req.body?.job_id];
  if(!job||job.state!=='running'||job.scope!=='private'||job.evaluation||job.kind!=='chat')return res.sendStatus(403);
  const changes=req.body.preferences;
  if(!changes||typeof changes!=='object'||Array.isArray(changes)||Object.entries(changes).some(([k,v])=>k==='bubble_mode'?!['single','adaptive'].includes(v):!['single_paragraph','omit_final_period'].includes(k)||typeof v!=='boolean'))return res.sendStatus(400);
  const cfg=config();cfg.reply_styles??={};const key=job.scope+':'+job.avatar;
  cfg.reply_styles[key]={...(cfg.reply_styles[key]||{}),...changes};
  const tmp=configPath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(cfg,null,2));fs.renameSync(tmp,configPath);
  res.json({saved:true,scope:job.scope,character:job.character,preferences:cfg.reply_styles[key]});
 });
 router.post('/cards',(_req,res)=>res.json({cards:cards().map(x=>({avatar:x.avatar,name:x.name})),roles:config().roles||{}}));
 router.post('/sync-cards',(req,res)=>{
  if(!Array.isArray(req.body.cards)||req.body.cards.length>500)return res.sendStatus(400);
  const list=req.body.cards.map(x=>({avatar:String(x.avatar),name:String(x.name),description:String(x.description||'').slice(0,16000),personality:String(x.personality||'').slice(0,4000),scenario:String(x.scenario||'').slice(0,4000)}));
  fs.writeFileSync(cardsPath,JSON.stringify(list));res.json({ok:true});
 });
 router.post('/role',(req,res)=>{
  const {scope,avatar}=req.body||{};if(!['private','group'].includes(scope))return res.sendStatus(400);
  const busyPath=path.join(root,'runtime/bridge-busy.json');const nativeBusy=fs.existsSync(busyPath)?JSON.parse(fs.readFileSync(busyPath,'utf8')):{};
  if((nativeBusy.jobs>0&&Date.now()-nativeBusy.time<5000)||Object.values(jobs).some(j=>['pending','running'].includes(j.state)))return res.status(409).json({error:'还有消息正在处理，请等回复完成再切换'});
  const card=cards().find(x=>x.avatar===avatar);if(!card)return res.status(404).json({error:'角色不存在，请先在酒馆导入'});
  const cfg=config();cfg.roles??={};const previous=cfg.roles[scope];cfg.roleChats??={};
  const mapKey=scope+':'+avatar;cfg.roles[scope]={avatar,name:card.name,revision:crypto.randomUUID(),chatFile:cfg.roleChats[mapKey]||'wechat-'+scope};cfg.roleChats[mapKey]=cfg.roles[scope].chatFile;
  cfg.enabled_scopes=[...new Set([...(cfg.enabled_scopes||[]),scope])];
  fs.writeFileSync(configPath,JSON.stringify(cfg,null,2));res.json({ok:true,role:cfg.roles[scope]});
 });
 router.post('/status',(_req,res)=>res.json({ready:Date.now()-heartbeat<10000,pending:Object.values(jobs).filter(j=>j.state==='pending').length}));
 router.post('/heartbeat',(req,res)=>{heartbeat=req.body?.connected===true?Date.now():0;res.json({ok:true})});
 router.post('/submit',(req,res)=>{
  if(!auth(req))return res.sendStatus(401);
  const {id,text,scope='private',sender='主人',senderId=null,turnContext='',kind='chat',requireReceipt=false,evaluationSession=null,visualEvent=null,coalesce=false}=req.body||{};
  if(typeof id!=='string'||!/^[\w:.-]{1,120}$/.test(id)||typeof text!=='string'||text.length>16000||!['private','group'].includes(scope))return res.sendStatus(400);
  if(typeof kind!=='string'||kind.length>5000||!(kind==='chat'||kind.startsWith('runtime:')))return res.sendStatus(400);
  if(typeof turnContext!=='string'||turnContext.length>24000)return res.sendStatus(400);
  if(evaluationSession!==null&&(typeof evaluationSession!=='string'||!/^[-a-zA-Z0-9]{1,60}$/.test(evaluationSession)))return res.sendStatus(400);
  if(visualEvent!==null&&(typeof visualEvent!=='string'||visualEvent.length>128))return res.sendStatus(400);
  if(typeof sender!=='string'||sender.length>128)return res.sendStatus(400);
  let identity;try{identity=speakerIdentity(scope,senderId,sender,!!evaluationSession)}catch{return res.sendStatus(400)}
  const existedBeforeSubmit=Boolean(jobs[id]);
  if(!jobs[id]){const role=choose(scope);jobs[id]={id,text,scope,sender,senderIdentity:identity,turnContext,kind,visualEvent,requireReceipt:requireReceipt===true,avatar:role.avatar,roleRevision:role.revision||null,character:role.name,evaluation:!!evaluationSession,coalesceEvaluation:!!evaluationSession&&coalesce===true,engine:generationEngine({scope,kind,evaluationSession,id,requireReceipt}),chatFile:evaluationSession?('evaluation-'+scope+'-'+evaluationSession):(role.chatFile||('wechat-'+scope)),state:'pending',created:Date.now()};save()}
  const video=req.body.nativeVideo;
  if(!existedBeforeSubmit&&video&&typeof video==='object'&&!Array.isArray(video)&&JSON.stringify(video).length<=16000&&jobs[id].state==='pending'){
   jobs[id].nativeVideo={status:String(video.status||'unknown').slice(0,60),server_id:typeof video.server_id==='string'&&/^\d{1,20}$/.test(video.server_id)?video.server_id:null,watched_entire_video:false,coverage:video.coverage&&typeof video.coverage==='object'?video.coverage:null};save();
  }
  res.json({id,state:jobs[id].state});
 });
 router.post('/visual',(req,res)=>{
  const job=jobs[req.body.job_id];if(!job||job.state!=='running')return res.sendStatus(409);
  if(!job.visualEvent)return res.json({image:null});
  try{
   const folder=fs.realpathSync(path.join(root,'runtime/media',job.scope,'incoming'));
   const name=crypto.createHash('sha256').update(job.visualEvent).digest('hex')+'.vision.jpg';
   const file=fs.realpathSync(path.join(folder,name));
   if(path.dirname(file)!==folder||fs.statSync(file).size>8*1024*1024)throw Error('Scope mismatch');
   const metadata=JSON.parse(fs.readFileSync(file.replace(/\.jpg$/,'.json'),'utf8'));
   const target=job.scope==='private'?'wxid_owner':'10000000@chatroom';
   if(metadata.event_id!==job.visualEvent||metadata.chat_id!==target||(job.scope==='private'&&metadata.sender_id!==target))throw Error('Event mismatch');
   const raw=fs.readFileSync(file);
   if(raw[0]!==255||raw[1]!==216||crypto.createHash('sha256').update(raw).digest('hex')!==metadata.sha256)throw Error('Image changed');
   const samples=(metadata.samples||[]).slice(0,3).map(sample=>{
    if(path.basename(sample.file)!==sample.file)throw Error('Invalid sample path');
    const frame=fs.realpathSync(path.join(folder,sample.file));
    if(path.dirname(frame)!==folder||fs.statSync(frame).size>8*1024*1024)throw Error('Sample scope mismatch');
    const bytes=fs.readFileSync(frame);
    if(bytes[0]!==255||bytes[1]!==216||crypto.createHash('sha256').update(bytes).digest('hex')!==sample.sha256)throw Error('Sample changed');
    return {image:'data:image/jpeg;base64,'+bytes.toString('base64'),frame:sample.frame,time_ms:sample.time_ms};
   });
   res.json({image:'data:image/jpeg;base64,'+raw.toString('base64'),samples,image_media:metadata.image_media,event_id:metadata.event_id,detail:metadata.detail});
  }catch{res.json({image:null,reason:'no_verified_preview'})}
 });
 router.post('/result',(req,res)=>{if(!auth(req))return res.sendStatus(401);const j=jobs[req.body.id];if(!j)return res.sendStatus(404);res.json(j)});
 router.post('/dsh-generate',async(req,res)=>{
  const job=jobs[req.body?.job_id];
  if(!dshAdmitted(job)||job.dshStarted)return res.status(409).json({error:'No new admitted DSH generation; never rerun unknown requests'});
  const history=req.body.history;
  if(!Array.isArray(history)||history.length>60||JSON.stringify(history).length>64000)return res.sendStatus(400);
  const card=cards().find(row=>row.avatar===job.avatar);if(!card)return res.sendStatus(404);
  const folder=path.join(root,'runtime/dsh-requests');fs.mkdirSync(folder,{recursive:true});
  const file=path.join(folder,crypto.createHash('sha256').update(job.id).digest('hex')+'.json');
  const callbackHints=job.scope==='group'&&job.visualEvent&&/^\[(?:图片|image)\]$/i.test(job.text.trim())&&Array.isArray(req.body.callbackHints)?req.body.callbackHints.filter(row=>row&&typeof row.word==='string'&&/^[\p{Script=Han}]{2,8}$/u.test(row.word)&&Number.isInteger(row.previous_assistant_turns)&&row.previous_assistant_turns>=3&&row.previous_assistant_turns<=14).slice(0,6):[];
  fs.writeFileSync(file,JSON.stringify({job,history,callbackHints,memories:Array.isArray(req.body.memories)?req.body.memories:[],capabilities:req.body.capabilities||null,replyStyle:config().reply_styles?.[job.scope+':'+job.avatar]||{},persona:[card.description,card.personality,card.scenario].filter(Boolean).join('\n')}));
  // Leave time for completion and native delivery inside the bridge's 150s wait.
  job.dshStarted=Date.now();job.dshDeadline=job.dshStarted+110000;save();
  try{
   const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/dsh_dispatch.py'),file],{timeout:135000,windowsHide:true,maxBuffer:128000});
   if(!dshAdmitted(job))return res.status(409).json({error:'Conversation changed before generation completed'});
   const result=JSON.parse(stdout);job.dshSession=result.session;job.dshModel=result.model;job.visualAttached=result.visual_attached;save();res.json(result);
  }catch{res.status(502).json({error:'DSH generation unavailable; no automatic backend fallback or retry'})}
 });
 router.post('/delivery',(req,res)=>{
  if(!auth(req))return res.sendStatus(401);
  const j=jobs[req.body.id];if(!j||j.state!=='done'||typeof req.body.delivered!=='boolean')return res.sendStatus(409);
  const state=req.body.delivered?'sent':'not_sent';
  if(j.delivery&&j.delivery!==state)return res.sendStatus(409);
  j.delivery=state;if(state==='sent')observation(j,typeof req.body.text==='string'?req.body.text:j.result,'delivery:'+j.id);save();res.json({ok:true});
 });
 router.post('/delivery-state',(req,res)=>{const j=jobs[req.body.id];if(!j)return res.sendStatus(404);res.json({delivery:j.delivery||'pending'})});
 router.post('/next',(req,res)=>{
  heartbeat=Date.now();importObservations();const {job,expired,contextOnly,supersededBy}=nextJob(jobs,Date.now(),{tavernReady:req.body?.tavernReady!==false});
  for(const id of expired){jobs[id].deliveryWaitExpired=Date.now();fs.appendFileSync(path.join(root,'runtime/delivery-order-audit.jsonl'),JSON.stringify({job_id:id,state:'delivery_wait_expired',time:Date.now(),automatic_resend:false})+'\n')}
  if(job){job.state='running';job.started=Date.now();if(contextOnly){job.contextOnly=true;job.supersededBy=supersededBy;jobs[supersededBy].burstContinuation=true}}
  if(job||expired.length)save();
  res.json({job:job||null});
 });
 router.post('/complete',(req,res)=>{
  const j=jobs[req.body.id];if(!j||j.state!=='running')return res.sendStatus(409);
  if(req.body.mediaReview&&typeof req.body.mediaReview==='object')j.mediaReview={attempted:req.body.mediaReview.attempted===true,issues:Array.isArray(req.body.mediaReview.issues)?req.body.mediaReview.issues.filter(x=>typeof x==='string').slice(0,12):[],outcome:String(req.body.mediaReview.outcome||'').slice(0,80),revision_tools:'none'};
  if(j.mediaReview&&Array.isArray(req.body.mediaReview?.remaining_narration))j.mediaReview.remaining_narration=req.body.mediaReview.remaining_narration.filter(x=>typeof x==='string').slice(0,8);
  j.state=req.body.error?'failed':'done';j.result=String(req.body.text||'');j.error=String(req.body.error||'');j.plan=req.body.plan||null;j.bubbles=Array.isArray(req.body.bubbles)&&req.body.bubbles.length<=3&&req.body.bubbles.every(x=>typeof x==='string'&&x.length<=16000)?req.body.bubbles:[j.result];j.recoveredEmpty=req.body.recoveredEmpty===true;j.completed=Date.now();save();res.json({ok:true});
 });
 router.post('/public-video',async(req,res)=>{
  const job=jobs[req.body?.job_id];
  if(job?.engine==='dsh'&&!auth(req))return res.sendStatus(401);
  if(!publicReadAdmitted(job))return res.sendStatus(403);
  const url=req.body?.url;if(typeof url!=='string'||url.length>2048)return res.sendStatus(400);
  const budget=Math.min(35,Math.floor(((job.dshDeadline||(job.started||job.created||0)+110000)-Date.now())/1000)-20);
  if(budget<5)return res.status(409).json({error:'Insufficient time for another video read; do not claim watched'});
  try{
   const token=JSON.parse(fs.readFileSync(path.join(root,'runtime/owner-ops.json'),'utf8')).token;
   const r=await fetch('http://127.0.0.1:18005/public-video',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({chat_id:job.scope==='private'?'wxid_owner':'10000000@chatroom',sender_id:job.scope==='private'?'wxid_owner':'scoped-public-reader',url,timeout_seconds:budget}),signal:AbortSignal.timeout(40000)});
   const evidence=await r.json();if(!publicReadAdmitted(job))return res.sendStatus(409);
   fs.appendFileSync(path.join(root,'runtime/public-video-tool-audit.jsonl'),JSON.stringify({job_id:job.id,url:evidence.url||null,status:evidence.status||r.status,reading_status:evidence.reading_status||null,evidence_chars:evidence.content_evidence?.length||0,time:Date.now()})+'\n');
   if(r.ok)evidence.journal_record=await recordReading(job,'video',evidence);
   res.status(r.status).json(evidence);
  }catch{res.status(502).json({error:'Public video read unavailable; no full-watch claim or silent retry'})}
 });
 router.post('/public-page',async(req,res)=>{
  const job=jobs[req.body?.job_id];if(!dshAdmitted(job))return res.sendStatus(403);
  if(typeof req.body.url!=='string'||req.body.url.length>2048)return res.sendStatus(400);
  try{
   const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/public_page_reader.py'),req.body.url],{timeout:40000,windowsHide:true,maxBuffer:256000});
   if(!dshAdmitted(job))return res.sendStatus(409);
   const page=JSON.parse(stdout);
   fs.appendFileSync(path.join(root,'runtime/public-page-audit.jsonl'),JSON.stringify({job_id:job.id,url:page.url,title:page.title,text_chars:page.text.length,text_truncated:page.text_truncated,time:Date.now()})+'\n');
   page.journal_record=await recordReading(job,'webpage',page);
   res.json(page);
  }catch{res.status(502).json({error:'Public page could not be read. This does not establish that it is a private website; do not invent its content or hosting.'})}
 });
 router.post('/public-note',async(req,res)=>{
  const job=jobs[req.body?.job_id];if(!dshAdmitted(job))return res.sendStatus(403);
  const url=req.body.url;if(typeof url!=='string'||url.length>2048)return res.sendStatus(400);
  const budget=Math.min(75,Math.floor(((job.dshDeadline||Date.now()+85000)-Date.now())/1000)-20);
  if(budget<15)return res.status(409).json({error:'Insufficient time for a public note read; do not claim content access'});
  try{
   const token=JSON.parse(fs.readFileSync(path.join(root,'runtime/owner-ops.json'),'utf8')).token;
   const r=await fetch('http://127.0.0.1:18005/public-note',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({chat_id:job.scope==='private'?'wxid_owner':'10000000@chatroom',sender_id:job.senderIdentity?.stable_id||(job.scope==='private'?'wxid_owner':'wxid_bot'),url,timeout_seconds:budget}),signal:AbortSignal.timeout((budget+18)*1000)});
   const evidence=await r.json();if(!dshAdmitted(job)||(job.dshDeadline&&Date.now()>=job.dshDeadline))return res.sendStatus(409);
   fs.appendFileSync(path.join(root,'runtime/public-note-tool-audit.jsonl'),JSON.stringify({job_id:job.id,url:evidence.url||null,status:evidence.status||r.status,reading_status:evidence.reading_status||null,image_reads:evidence.image_reads_verified||0,evidence_chars:evidence.content_evidence?.length||0,time:Date.now()})+'\n');
   if(r.ok)evidence.journal_record=await recordReading(job,'picture_note',evidence);
   res.status(r.status).json(evidence);
  }catch{res.status(502).json({error:'Public note read unavailable; no silent retry or invented image text'})}
 });
 router.post('/reading-journal',async(req,res)=>{
  const job=jobs[req.body?.job_id];
  if(job?.engine==='dsh'&&!auth(req))return res.sendStatus(401);
  if(!publicReadAdmitted(job))return res.sendStatus(403);
  const {query='',limit=6,days=14}=req.body;
  if(typeof query!=='string'||query.length>100||!Number.isInteger(limit)||limit<1||limit>12||!Number.isInteger(days)||days<1||days>180)return res.sendStatus(400);
  try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/reading_journal.py'),JSON.stringify({operation:'recent',job_id:job.id,query,limit,days})],{timeout:5000,windowsHide:true,maxBuffer:160000});if(!publicReadAdmitted(job))return res.sendStatus(409);res.json(JSON.parse(stdout));}
  catch{res.status(409).json({error:'Current-role reading records unavailable; do not invent digital experiences'})}
 });
 router.post('/web-search',async(req,res)=>{
  const query=req.body?.query;if(typeof query!=='string'||!query.trim()||query.length>128)return res.sendStatus(400);
  try{
   const secrets=JSON.parse(fs.readFileSync('data/default-user/secrets.json','utf8'));
   const stored=secrets.api_key_custom;const key=Array.isArray(stored)?stored.find(x=>x.active)?.value:stored;
   const r=await fetch('https://api.deepseek.com/v1/tools/search',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({query,count:5,need_content:false}),signal:AbortSignal.timeout(45000)});
   if(!r.ok)return res.status(502).json({error:'Search provider failed'});
   const data=await r.json();const results=data.results||[];
   res.json({textBits:results.map(x=>[x.title,x.url,x.snippet||x.summary||''].join('\n')),links:results.map(x=>x.url),images:[]});
  }catch{res.status(502).json({error:'Search unavailable; no fabricated results'})}
 });
 router.post('/capabilities',(req,res)=>{
  const job=jobs[req.body?.job_id];
  if(!job||job.state!=='running'||!['private','group'].includes(job.scope)||choose(job.scope).avatar!==job.avatar||(choose(job.scope).revision||null)!==(job.roleRevision||null)||(job.dshDeadline&&Date.now()>=job.dshDeadline))return res.sendStatus(403);
  let tavernModel={model:null,source:'active_configuration_unavailable'};
  try{tavernModel=configuredTavernModel(JSON.parse(fs.readFileSync('data/default-user/settings.json','utf8')))}catch{}
  res.json(scopedCapabilities({
  generation:{current:job?.engine==='dsh'?'dsh-sdk':'tavern',model_policy:job?.scope==='private'?(config().dsh_models?.private||{text:'deepseek-flash',image:'deepseek-flash'}):null,evaluation:job?.evaluation===true,dsh_independent_generation_verified:fs.existsSync(path.join(root,'runtime/dsh-sdk-acceptance.json')),dsh_inventory_tool_verified:fs.existsSync(path.join(root,'runtime/dsh-tool-model-acceptance.json')),dsh_production_routing:config().generation_backends?.private==='dsh',dsh_scopes:config().generation_backends?.private==='dsh'?['private']:[]},
  local_audio:{synthesis:'offline Kokoro Chinese female voice, configured under __VOICE_ROOT__; /media kind=tts generates a real playable WAV file',dsh_tool:'synthesize_speech',file_generation:true,wechat_native_voice_bubble:false,warning:'Do not confuse generating a playable local audio file with sending a native voice bubble'},
  moments:{read_available:momentsReady(),dsh_tool:'read_moments',source:'bound alt local SNS cache only; no network refresh',publish:false,like:false,comment:false},
  model_tools:[...(job?.engine==='dsh'?['web_search searches public pages','web_fetch reads public web pages','read_public_page reads verified public pages under proxy DNS','read_public_video reads public Bilibili subtitles or sampled frames/audio; never a full-watch guarantee','read_public_note reads public Douyin image notes using isolated browser screenshots; partial coverage only','recent_interests recalls current-role actual public reading records and source-bound internal notes; no test reads','recovery_status reads owner-private backup and isolated recovery status without performing recovery','draw_image submits one local drawing for async native delivery; drawing_status queries actual progress','prepare_reply prepares 1-3 chat bubbles or silence, does not mark them sent','companion_followup queries/schedules/cancels owner-private bounded followups; genuine owner turns and verified live followup activities can schedule; evaluation and unrelated runtime cannot']:['WebSearch searches public pages','VisitLinks reads web pages']),'synthesize_speech creates offline audio in the current conversation; use media_inventory and send_media to send it as a file','media_inventory lists current-conversation audio/video/image IDs','send_media sends one scoped media file per real turn; evaluation cannot send; verified owner autonomous activities can send','sticker_inventory searches verified shared stickers','send_sticker submits a verified inventory ID to native WeChat and returns actual acceptance state','conversation_history recalls genuine scoped conversations','character_memory stores evidence-bound preferences and corrections','remember_reply_style saves formatting preferences'],
  bridge_tools:{stickers:'sticker_inventory查真实id，再用send_sticker发当前会话；自然语言明确索图也可由桥接处理。native_accepted非用户已看到；不输出文字发送标记冒充执行',drawing:'draw_image描述画面，depicts_self=true画当前角色；提交后用drawing_status查进度，本机出图后原生发回私聊。排队不等于已发。画一张… 或 /画图 也保留。',images:'收到图片和引用后后台识别；以本轮对应图片证据为准',reminders:'reminder工具创建带时区日期时间的持久提醒，支持每日/每周；list/get查真实任务和发送记录，cancel取消。存入不是已发，sent也不是已读；主人日程不随角色切换消失。',companion:job?.engine==='dsh'?'companion_followup status查真实计划；schedule安排3分钟至7天后的具体兴趣，已核验的私聊自主活动可继续安排；高自主模式无日配额和固定夜间停机。新消息/晚安/去忙/角色切换取消旧计划':'开启陪伴模式 / 暂停陪伴，半小时内最多三次跟进',sharing:'read_public_video读取公开B站链接/BV号和b23短链；聊天与后台分享共用有时间上限的读取服务。按字幕/抽帧/音轨证据聊天，不能说完整看过。read_public_note可读取公开抖音图文短链并实际截图识字，以coverage为准；抖音视频仍未接通内容读取。分享个热点 / 分享日常 / 暂停主动分享 / 恢复主动分享',owner_ops:'主人私聊 /龙虾 任务 或 /openclaw 任务；进度怎么样 查询结果'},
  incoming_owner_voice:{deployed:true,source:'bound alt private-chat DB, exact server message ID and SILK bytes',recognizer:'offline SenseVoice under __VOICE_ROOT__',genuine_owner_sample_verified:false,warning:'ASR can confuse homophones; a synthetic local diagnostic is not genuine incoming WeChat acceptance'},
  not_connected:['微信原生语音气泡发送','朋友圈发布、点赞、评论及主动刷新'],
  limits:'工具调用返回结果才证明执行。桥接入口不是模型直接函数，不要假装已调用；不能把未接通能力概括成无工具。'
 },job,tavernModel));});
 router.post('/recovery-status',async(req,res)=>{
  const job=jobs[req.body?.job_id];
  if(!dshAdmitted(job)||job.scope!=='private'||(job.kind!=='chat'&&!(await autonomousAllowed(job))))return res.sendStatus(403);
  try{
   const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/backup_retention.py'),'--status'],{timeout:10000,windowsHide:true,maxBuffer:32000});
   if(!dshAdmitted(job))return res.sendStatus(409);
   res.json(JSON.parse(stdout));
  }catch{res.status(503).json({error:'Local recovery status unavailable; no backup/restore action was attempted'})}
 });
 router.post('/memory',async(req,res)=>{
  const {job_id,operation,value='',replaces=[]}=req.body||{};
  if(typeof job_id!=='string'||!['search','remember','forget','preference'].includes(operation)||typeof value!=='string'||value.length>300||!Array.isArray(replaces)||replaces.length>8||replaces.some(x=>typeof x!=='string'))return res.sendStatus(400);
  try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/character_memory.py'),JSON.stringify({job_id,operation,value,replaces})],{timeout:10000,windowsHide:true,maxBuffer:16000});res.json(JSON.parse(stdout));}
  catch(e){res.status(400).json({error:'Memory operation rejected; user evidence or active scope missing'})}
 });
 router.post('/style-evolution',async(req,res)=>{
  if(!auth(req))return res.sendStatus(401);
  const {job_id,dimension,preference,quote}=req.body||{},job=jobs[job_id];
  if(!dshAdmitted(job)||job.evaluation||job.scope!=='private'||job.kind!=='chat'||typeof quote!=='string'||quote.length>2000)return res.sendStatus(403);
  try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/style_evolution.py'),JSON.stringify({job_id,dimension,preference,quote})],{timeout:35000,windowsHide:true,maxBuffer:2000});res.json(JSON.parse(stdout));}
  catch{res.status(400).json({error:'Style update requires current explicit owner feedback; no identity or permission rewrite'})}
 });
 router.post('/followup',async(req,res)=>{
  const {job_id,operation='status',after_minutes,topic}=req.body||{};
  if(typeof job_id!=='string'||!['status','schedule','cancel'].includes(operation)||typeof topic==='string'&&topic.length>300)return res.sendStatus(400);
  try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/companion_wake.py'),JSON.stringify({job_id,operation,after_minutes,topic})],{timeout:10000,windowsHide:true,maxBuffer:16000});res.json(JSON.parse(stdout));}
  catch{res.status(400).json({error:'Followup rejected: stale/evaluation/unrelated-runtime/group turn, stopped owner, or exhausted window/budget'})}
 });
 router.post('/moments',async(req,res)=>{
  const job=jobs[req.body?.job_id];const limit=req.body?.limit??5;
  if(!job||job.state!=='running'||job.scope!=='private'||(job.kind!=='chat'&&!(await autonomousAllowed(job)))||job.evaluation||job.avatar!==choose('private').avatar)return res.sendStatus(403);
  if(!Number.isInteger(limit)||limit<1||limit>10)return res.sendStatus(400);
  try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/wechat_social_reader.py'),String(limit)],{timeout:15000,windowsHide:true,maxBuffer:160000});res.json(JSON.parse(stdout));}
  catch{res.status(502).json({error:'Bound-alt cached Moments unavailable; do not guess posts or switch accounts'})}
 });
 router.post('/history',async(req,res)=>{
  const {job_id,query=''}=req.body||{};
  if(typeof job_id!=='string'||typeof query!=='string'||query.length>200)return res.sendStatus(400);
  try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/tavern_history.py'),JSON.stringify({job_id,query})],{timeout:10000,windowsHide:true,maxBuffer:48000});res.json(JSON.parse(stdout));}
  catch{res.status(400).json({error:'History is unavailable for this active role'})}
 });
 router.post('/media-inventory',async(req,res)=>{
  if(!auth(req))return res.sendStatus(401);
  const job=jobs[req.body?.job_id];if(!dshAdmitted(job)||job.evaluation||(!(job.kind==='chat'&&job.id.startsWith('wechat:'))&&!(await autonomousAllowed(job))))return res.sendStatus(403);
  try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/media_actions.py'),JSON.stringify({job_id:job.id})],{timeout:10000,windowsHide:true,maxBuffer:80000});res.json(JSON.parse(stdout))}
  catch{res.status(409).json({error:'Current conversation media unavailable'})}
 });
 router.post('/host-access-diagnostic',async(req,res)=>{
  if(!auth(req))return res.sendStatus(401);
  if(Object.values(jobs).some(job=>['running','pending'].includes(job.state)))return res.status(409).json({error:'Conversation busy'});
  try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/host_executor.py'),'--probe'],{timeout:140000,windowsHide:true,maxBuffer:16000});const result=JSON.parse(stdout);res.status(result.success?200:503).json(result);}
  catch{res.status(503).json({error:'Fixed DSH host-access diagnostic did not complete'})}
 });
 router.post('/media-send',async(req,res)=>{
  if(!auth(req))return res.sendStatus(401);
  const {job_id,item_id}=req.body||{},job=jobs[job_id];
  if(!dshAdmitted(job)||job.evaluation||(!(job.kind==='chat'&&job.id.startsWith('wechat:'))&&!(await autonomousAllowed(job)))||typeof item_id!=='string'||!/^[a-f0-9]{64}$/.test(item_id))return res.status(403).json({state:'rejected'});
  if(job.dshDeadline&&Date.now()>=job.dshDeadline)return res.status(409).json({state:'rejected',reason:'generation_expired'});
  const folder=path.join(root,'runtime/media-actions');fs.mkdirSync(folder,{recursive:true});
  const key=crypto.createHash('sha256').update(job_id).digest('hex');
  const request=path.join(folder,key+'.request.json'),claimed=path.join(folder,key+'.claimed.json'),result=path.join(folder,key+'.result.json');
  if(![request,claimed,result].some(p=>fs.existsSync(p))){const temp=request+'.tmp';fs.writeFileSync(temp,JSON.stringify({job_id,item_id}));fs.renameSync(temp,request)}
  for(let attempt=0;attempt<150;attempt++){
   if(fs.existsSync(result))return res.json(JSON.parse(fs.readFileSync(result,'utf8')));
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  res.json({state:'unknown',reason:'native_confirmation_pending_do_not_retry'});
 });
 router.post('/sticker-send',async(req,res)=>{
  const {job_id,item_id}=req.body||{};const job=jobs[job_id];
  if(!job||job.state!=='running'||job.evaluation||(!(job.kind==='chat'&&job.id.startsWith('wechat:'))&&!(await autonomousAllowed(job)))||typeof item_id!=='string'||item_id.length>200)return res.status(400).json({state:'rejected'});
  if(job.dshDeadline&&Date.now()>=job.dshDeadline)return res.status(409).json({state:'rejected',reason:'generation_expired'});
  const folder=path.join(root,'runtime/sticker-actions');fs.mkdirSync(folder,{recursive:true});
  const key=crypto.createHash('sha256').update(job_id).digest('hex');
  const request=path.join(folder,key+'.request.json'),claimed=path.join(folder,key+'.claimed.json'),result=path.join(folder,key+'.result.json');
  if(![request,claimed,result].some(p=>fs.existsSync(p))){const temp=request+'.tmp';fs.writeFileSync(temp,JSON.stringify({job_id,item_id}));fs.renameSync(temp,request)}
  for(let attempt=0;attempt<150;attempt++){
   if(fs.existsSync(result))return res.json(JSON.parse(fs.readFileSync(result,'utf8')));
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  res.json({state:'unknown',reason:'native_confirmation_pending_do_not_retry'});
 });
 router.post('/reminders',async(req,res)=>{
  if(!auth(req))return res.sendStatus(401);
  const job=jobs[req.body?.job_id];if(!dshAdmitted(job)||job.evaluation||job.kind!=='chat'||!job.id.startsWith('wechat:'))return res.sendStatus(403);
  const {job_id,operation,when,text,repeat,id,include_completed}=req.body;
  try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/reminder_tools.py'),JSON.stringify({job_id,operation,when,text,repeat,id,include_completed})],{timeout:10000,windowsHide:true,maxBuffer:80000});res.json(JSON.parse(stdout));}
  catch{res.status(409).json({error:'Reminder rejected or result unknown; list schedules before retrying creation'})}
 });
 router.post('/drawing',async(req,res)=>{
  if(!auth(req))return res.sendStatus(401);
  const job=jobs[req.body?.job_id];if(!dshAdmitted(job)||job.evaluation||(!(job.kind==='chat'&&job.id.startsWith('wechat:'))&&!(await autonomousAllowed(job))))return res.sendStatus(403);
  const {job_id,operation,prompt,depicts_self}=req.body;
  try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/drawing_actions.py'),JSON.stringify({job_id,operation,prompt,depicts_self})],{timeout:10000,windowsHide:true,maxBuffer:20000});res.json(JSON.parse(stdout));}
  catch{res.status(409).json({error:'Drawing could not be newly submitted; inspect drawing_status, do not assume success or resubmit blindly'})}
 });
 router.post('/inventory',async(req,res)=>{
  if(typeof req.body?.query!=='string'||req.body.query.length>200)return res.sendStatus(400);
  try{const {stdout}=await promisify(execFile)(path.join(root,'runtime/MaiBot/.venv/Scripts/python.exe'),['-X','utf8',path.join(root,'integration/tavern_tools.py'),req.body.query],{timeout:15000,windowsHide:true,maxBuffer:128000});res.json(JSON.parse(stdout))}
  catch{res.status(502).json({error:'Inventory could not be verified; do not claim empty'})}
 });
 router.get('/speech/:file',(req,res)=>{
  if(!/^[a-f0-9]{32}\.wav$/.test(req.params.file))return res.sendStatus(400);
  const current=path.join('__VOICE_ROOT__/audio/private',req.params.file);
  res.sendFile(fs.existsSync(current)?current:path.join(root,'runtime/media/private/audio',req.params.file));
 });
 router.post('/media',async(req,res)=>{
  const mediaJob=jobs[req.body?.job_id],scope=mediaJob?.scope||'private';
  if(scope==='group'&&(!auth(req)||!dshAdmitted(mediaJob)||req.body?.kind!=='tts'))return res.sendStatus(403);
  const selected=choose(scope);const role={avatar:selected.avatar,revision:selected.revision||null};
  const sourceValid=async()=>{const current=choose(scope);if(current.avatar!==role.avatar||(current.revision||null)!==role.revision)return false;if(!req.body?.job_id)return true;const job=jobs[req.body.job_id];return !!job&&job.state==='running'&&job.scope===scope&&!job.evaluation&&((job.kind==='chat'&&job.id.startsWith('wechat:'))||(await autonomousAllowed(job)))&&job.avatar===role.avatar&&(job.roleRevision||null)===role.revision&&(!job.dshDeadline||job.dshDeadline>Date.now());};
  if(!(await sourceValid()))return res.sendStatus(403);
  const routes={draw:'/generate',memes:'/memes',tts:'/tts'};
  const route=routes[req.body?.kind];if(!route||typeof req.body.text!=='string'||req.body.text.length>4000)return res.sendStatus(400);
  try{
   const token=JSON.parse(fs.readFileSync(path.join(root,'runtime/owner-ops.json'),'utf8')).token;
   const r=await fetch('http://127.0.0.1:18005'+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({chat_id:scope==='group'?'10000000@chatroom':'wxid_owner',sender_id:scope==='group'?'group-media-tool':'wxid_owner',text:req.body.text,...(req.body.kind==='tts'?{character:role.avatar,job_id:req.body.job_id}:{})})});
   const result=await r.json();
   if(!(await sourceValid()))return res.status(409).json({error:'Role or request changed during media preparation; no WeChat delivery occurred',local_audio_created:req.body.kind==='tts'&&r.ok&&!!result.path,wechat_sent:false});
   if(req.body.kind==='tts'&&r.ok&&result.path){if(scope==='private')result.playback_url='/api/plugins/dafeiyu/speech/'+path.basename(result.path);result.next_step=result.media_item?.id?'send_media with media_item.id':'media_inventory then send_media with matching file name';result.delivery={local_audio_created:true,wechat_sent:false,native_voice_connected:false};}
   res.status(r.status).json(result);
  }catch{res.status(502).json({error:'Local media service unavailable'})}
 });
}

