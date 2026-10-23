import fs from 'node:fs';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {safeFetchBuffer} from './safe-fetch.js';
import {normalizeImageForModel} from './media-normalize.js';

const VOICE_ROOT='__VOICE_ROOT__/qwen3';
const STICKERS=path.resolve(import.meta.dirname,'../state/stickers.json');
export function stickerInventory(){return JSON.parse(fs.readFileSync(STICKERS,'utf8')).filter(x=>x.source==='manual'&&/^https:\/\//.test(x.url)).slice(0,120).map(x=>({id:x.id,description:x.desc,url:x.url}));}
export function parseMediaReply(value,inventory=stickerInventory()){
  let p;try{p=JSON.parse(value);}catch{p={text:value};}
  if(!p||typeof p.text!=='string'||!p.text.trim()||p.text.length>24000)throw Error('无效的抖音回复或超过传输保护上限');
  if(p.stickerId&&!inventory.some(x=>x.id===p.stickerId))throw Error('未知表情 ID');
  if(p.voice!==undefined&&typeof p.voice!=='boolean')throw Error('无效语音开关');
  return {text:p.text,voice:p.voice===true,stickerId:p.stickerId||null};
}
// Optional media choices cannot turn a usable text reply into a failed turn.
export function normalizeMediaReply(value,inventory=stickerInventory()){
  const clean=String(value).trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i,'$1').replace(/^\.?json\s*(?=\{)/i,'');
  let p;try{p=JSON.parse(clean);}catch{
    if(/^[{\[]/.test(clean))throw Error('媒体回复 JSON 不完整，尚未发送');
    p={text:clean};
  }
  const safe={text:p?.text,voice:p?.voice===true,stickerId:inventory.some(s=>s.id===p?.stickerId)?p.stickerId:null};
  return JSON.stringify(parseMediaReply(JSON.stringify(safe),inventory));
}
export async function imagePart(content,fetchImage=safeFetchBuffer){
  const candidates=content.kind==='image'?[...(content.image.mediumUrls||[]),...(content.image.originUrls||[]),...(content.image.largeUrls||[]),...(content.image.thumbUrls||[])]:content.kind==='emoji'?[content.url]:[];
  const urls=[...new Set(candidates.filter(u=>typeof u==='string'&&/^https?:\/\//i.test(u)))];
  const errors=[];
  if(!urls.length)throw Error('图片没有可下载的 HTTP(S) 地址');
  for(const url of urls.slice(0,8))try{
    const options={publicDnsFallback:true};
    if(content.kind==='image'&&content.image.skey){
      const {decryptImage,sniffImageFormat}=await import('../../tools/douyin-im/lib/services/im/media.js');
      options.decodeImage=bytes=>sniffImageFormat(bytes)==='unknown'?decryptImage(bytes,content.image.skey):bytes;
    }
    const {buffer}=await fetchImage(url,8*1024*1024,options);
    const p=await normalizeImageForModel(buffer,null);
    if(p.ok)return {type:'image',mediaType:p.mimeType,data:p.buffer.toString('base64'),name:'douyin-image',note:p.note||''};
    throw Error('图片归一化失败');
  }catch(e){errors.push(String(e.message).replace(/https?:\/\/\S+/g,'[URL]').slice(0,200));}
  throw Error('图片读取失败：'+[...new Set(errors)].join(' | '));
}
export async function synthesizeSpeech(text,signal){
  const token=fs.readFileSync(path.join(VOICE_ROOT,'access-token.txt'),'utf8').trim();
  const request=async(route,body)=>{
    signal.throwIfAborted();
    const r=await fetch('http://127.0.0.1:18034'+route,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});
    const value=await r.json();if(!r.ok)throw Error('本地语音服务未完成请求');return value;
  };
  const prefs=JSON.parse(fs.readFileSync(path.join(VOICE_ROOT,'preferences.json'),'utf8'));
  const job=await request('/generate',{text,voice:['cool','gentle','husky'].includes(prefs.defaultVoice)?prefs.defaultVoice:'gentle'});
  if(!/^[a-f0-9-]{36}$/.test(job.id))throw Error('无效语音任务');
  for(let i=0;i<150;i++){
    const result=await request('/jobs/'+job.id);
    if(result.status==='failed')throw Error('语音生成失败');
    if(result.status==='completed'){
      const base=fs.realpathSync(path.join(VOICE_ROOT,'audio')),file=fs.realpathSync(result.file);
      if(path.relative(base,file)!==job.id+'.wav')throw Error('语音输出路径不匹配');
      if(fs.statSync(file).size>20*1024*1024)throw Error('语音文件过大');
      return {type:'file-upload',data:fs.readFileSync(file),name:'大肥鱼语音.wav'};
    }
    await delay(1000,undefined,{signal});
  }
  throw Error('语音生成超时');
}

// A bounded media executor; it never accepts a recipient, file path or URL from the model.
export class DouyinMedia {
  constructor({inventory=stickerInventory,fetchImage=safeFetchBuffer,speech=synthesizeSpeech}={}){Object.assign(this,{inventory,fetchImage,speech});this.last=new Map();}
  async prepare(reply,uid,signal){
    const inventory=this.inventory(),p=parseMediaReply(reply,inventory),messages=[p.text],notes=[];
    if(p.voice)try{messages.push(await this.speech(p.text,signal));notes.push('语音文件');}catch(e){signal.throwIfAborted();notes.push('语音生成失败，已保留文字');}
    if(p.stickerId&&Date.now()-(this.last.get(uid)||0)>600000)try{
      const s=inventory.find(x=>x.id===p.stickerId);
      const local=path.resolve(import.meta.dirname,'../../assets/whale-gifs',path.basename(new URL(s.url).pathname));
      const buffer=s.id.startsWith('whale-gif-')&&fs.existsSync(local)?fs.readFileSync(local):(await this.fetchImage(s.url,8*1024*1024,{publicDnsFallback:true})).buffer;
      if(buffer.length>8*1024*1024)throw Error('表情过大');
      messages.push({type:'image',data:buffer});notes.push('表情:'+s.id);
    }catch{notes.push('表情获取失败，已保留文字');}
    signal.throwIfAborted();return {text:p.text,messages,notes,stickerId:p.stickerId};
  }
  sent(uid,plan){if(plan.messages.some(x=>x.type==='image'))this.last.set(uid,Date.now());}
}
