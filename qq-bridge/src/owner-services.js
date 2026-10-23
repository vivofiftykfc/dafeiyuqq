import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fetchStickerBuffer} from './curated-stickers.js';
import {sharedImageFile} from './shared-images.js';
export const ROOT=path.resolve(import.meta.dirname,'..');
export const OWNER='10000001', BOT='10000002';
export const DATA=path.join(ROOT,'state','owner');
export const MEDIA=path.join(ROOT,'..','assets','generated');
fs.mkdirSync(DATA,{recursive:true});fs.mkdirSync(MEDIA,{recursive:true});
const read=(p)=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
export function guard(){
 const c=read(path.join(ROOT,'config.json')),m=read(path.join(ROOT,'state','mode.json'));
 if(String(c.ownerQQ)!==OWNER||m.mode!=='closed-agent'||c.allow.groups.length||c.allow.private.some(x=>String(x)!==OWNER)||c.allowAllWhenEmpty)throw Error('Owner-only configuration required');
 return c;
}
function save(file,value){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2));fs.renameSync(tmp,file);}
export function memoryRead(){guard();const p=path.join(DATA,'memory.json');return fs.existsSync(p)?read(p):{facts:[]};}
export function memoryRemember(fact,evidence){
 guard();const data=memoryRead();
 if(data.facts.some(x=>x.fact===fact))return {count:data.facts.length,unchanged:true};
 const row={fact,evidence,at:new Date().toISOString()};
 const file=path.join(DATA,'memory.json'),backups=path.join(DATA,'memory-backups');
 fs.mkdirSync(backups,{recursive:true});
 if(fs.existsSync(file))fs.copyFileSync(file,path.join(backups,Date.now()+'-'+crypto.randomUUID()+'.json'));
 data.facts.push(row);save(file,data);
 fs.appendFileSync(path.join(DATA,'memory-journal.jsonl'),JSON.stringify(row)+'\n');
 return {count:data.facts.length};
}
async function rawOnebot(action,params){
 const c=guard();const ob=read(path.join(c.snowluma.homeDir,'config',`onebot_${BOT}.json`));const h=ob.networks.httpServers[0];
 if(h.host!=='127.0.0.1')throw Error('Only loopback gateway allowed');
 const r=await fetch(`http://127.0.0.1:${h.port}/${action}`,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+h.accessToken},body:JSON.stringify(params),signal:AbortSignal.timeout(45000)});
 const b=await r.json();if(!r.ok||b.status!=='ok'||b.retcode!==0)throw Error(`${action}: ${b.wording||b.message||b.retcode||r.status}`);return b.data;
}
export async function onebot(action,params){const me=await rawOnebot('get_login_info',{});if(String(me.user_id)!==BOT)throw Error('Wrong QQ account');return rawOnebot(action,params);}
function generatedFile(file){const real=fs.realpathSync(file),base=fs.realpathSync(MEDIA),rel=path.relative(base,real);if(!rel||rel.startsWith('..')||path.isAbsolute(rel)||!real.endsWith('.png'))throw Error('Only generated PNG files allowed');if(fs.statSync(real).size>20*1024*1024)throw Error('Image too large');return real;}
export async function sendImage(file){guard();const p=generatedFile(file);return onebot('send_private_msg',{user_id:Number(OWNER),message:[{type:'image',data:{file:'base64://'+fs.readFileSync(p).toString('base64')}}]});}
export function stickerSearch(query=''){
 guard();const entries=read(path.join(ROOT,'state','stickers.json'));
 const words=String(query).toLowerCase().split(/\s+/).filter(Boolean);
 return entries.filter(e=>e.source==='manual').map(e=>({e,score:words.reduce((n,w)=>n+(JSON.stringify([e.desc,e.tags,e.localNote]).toLowerCase().includes(w)?1:0),0)}))
 .filter(x=>!words.length||x.score>0).sort((a,b)=>b.score-a.score).slice(0,15).map(({e})=>({id:e.id,description:e.desc,tags:e.tags}));
}
export async function stickerSend(id){
 guard();const entry=read(path.join(ROOT,'state','stickers.json')).find(e=>e.id===id&&e.source==='manual');
 if(!entry||!/^whale-gif-\d{3}$/.test(id))throw Error('Use a valid local whale sticker id');
 const {buffer}=await fetchStickerBuffer(entry,8*1024*1024);
 return onebot('send_private_msg',{user_id:Number(OWNER),message:[{type:'image',data:{file:'base64://'+buffer.toString('base64')}}]});
}
async function comfy(endpoint,options={}){const r=await fetch('http://127.0.0.1:8188'+endpoint,{...options,signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`ComfyUI ${endpoint}: HTTP ${r.status}`);return r;}
export async function generate(prompt,selfPortrait=true){
 guard();const id=crypto.randomUUID();
 const identity=read(path.join(ROOT,'..','assets','identity','manifest.json'));
 const text=selfPortrait?identity.visual_prompt+'。场景：'+prompt:prompt;
 const graph={
 '1':{class_type:'UnetLoaderGGUF',inputs:{unet_name:'qwen-image-2.1-UC-Q6_K.gguf'}},
 '2':{class_type:'CLIPLoader',inputs:{clip_name:'qwen3vl_8b_int8_convrot.safetensors',type:'qwen_image',device:'default'}},
 '3':{class_type:'VAELoader',inputs:{vae_name:'qwen_image_2.1_vae_bf16.safetensors'}},
 '4':{class_type:'TextEncodeQwenImage21',inputs:{clip:['2',0],vae:['3',0],prompt:text,negative_prompt:'blurry, deformed hands, extra limbs, watermark',resolution:512}},
 '5':{class_type:'KSampler',inputs:{model:['1',0],seed:crypto.randomInt(4294967295),steps:20,cfg:1,sampler_name:'euler',scheduler:'simple',positive:['4',0],negative:['4',1],latent_image:['4',2],denoise:1}},
 '6':{class_type:'VAEDecode',inputs:{samples:['5',0],vae:['3',0]}},
 '7':{class_type:'SaveImage',inputs:{images:['6',0],filename_prefix:'dafeiyuqq/'+id}}};
 if(selfPortrait){const file=path.join(ROOT,'..','assets','identity','base-six-views.png');const bytes=fs.readFileSync(file);if(crypto.createHash('sha256').update(bytes).digest('hex')!==identity.references[0].sha256)throw Error('Identity hash mismatch');const form=new FormData();form.set('image',new Blob([bytes],{type:'image/png'}),'base-six-views.png');form.set('subfolder','dafeiyuqq');form.set('overwrite','true');const up=await(await comfy('/upload/image',{method:'POST',body:form})).json();graph['11']={class_type:'LoadImage',inputs:{image:up.subfolder+'/'+up.name}};graph['4'].inputs['images.image_1']=['11',0];}
 const job=await(await comfy('/prompt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:graph,client_id:'dafeiyuqq-owner'})})).json();
 save(path.join(MEDIA,id+'.json'),{id,prompt,job:job.prompt_id,status:'submitted'});return {id,status:'submitted',instruction:'Use image_status to poll this id; do not submit a duplicate job.'};
}
export async function imageStatus(id){guard();if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid job id');const file=path.join(MEDIA,id+'.json'),job=read(file);if(job.status==='completed')return job;
 const all=await(await comfy('/history/'+job.job)).json(),history=all[job.job];if(!history)return {...job,status:'pending'};
 if(history.status?.status_str==='error'){job.status='error';save(file,job);return job;}
 const output=history.outputs?.['7']?.images?.[0];if(!output)return {...job,status:'pending'};
 const r=await comfy('/view?'+new URLSearchParams(output));const bytes=Buffer.from(await r.arrayBuffer());if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid image result');const dest=path.join(MEDIA,id+'.png');fs.writeFileSync(dest,bytes);Object.assign(job,{status:'completed',file:dest});save(file,job);return job;
}
export async function qzoneRead(){return onebot('get_qzone_msg_list',{num:5});}
export async function qzonePost(content,images=[]){
 guard();const log=path.join(DATA,'qzone-posts.json');const past=fs.existsSync(log)?read(log):[];
 content=String(content).trim();if(!content||content.length>2000)throw Error('Qzone text must contain 1-2000 characters');
 if(past.some(x=>x.content===content&&Date.now()-x.at<86400000))throw Error('Same Qzone content was already attempted today; inspect posts instead of retrying');
 if(past.some(x=>Date.now()-x.at<60000)||past.filter(x=>Date.now()-x.at<86400000).length>=6)throw Error('Qzone posting rate limit');
 const files=images.map(p=>{let file;try{file=generatedFile(p);}catch{file=sharedImageFile(p);}return 'base64://'+fs.readFileSync(file).toString('base64');});
 // Record an attempt before sending; a timeout must not trigger blind duplicate posting.
 const row={at:Date.now(),content,status:'pending'};past.push(row);save(log,past);
 try{
  const result=await onebot('send_qzone_msg',{content,...(files.length?{images:files}:{})});row.status='sent';row.result=result;save(log,past);
  try{const list=await qzoneRead();row.verified=!!list.msglist?.some(p=>p.tid===result.tid);save(log,past);}catch{row.verified=false;save(log,past);}
  return {...result,verified:row.verified,url:result.tid?`https://user.qzone.qq.com/${BOT}/mood/${result.tid}`:undefined};
 }catch(e){row.status='failed-or-unknown';save(log,past);throw e;}
}
