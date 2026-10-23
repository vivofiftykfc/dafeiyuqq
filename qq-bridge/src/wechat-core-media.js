import {mediaScope} from './wechat-scope.js';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {stickerInventory} from './douyin-media.js';import {fetchStickerBuffer} from './curated-stickers.js';
import * as voice from './owner-voice.js';import * as image from './owner-services.js';
export async function coreMedia(core,peer,action,args,check=()=>{}){
  core.state.resources??={};const key=peer+':'+args.kind+':'+args.resource;
  if(action==='media-list')return {stickers:stickerInventory().map(({id,description})=>({id,description})),voiceDefault:'gentle'};
  if(action==='voice-generate'){
    if(typeof args.text!=='string'||!args.text.trim()||args.text.length>300)throw Error('Voice text must be 1..300 characters');
    const job=await voice.generate(args.text,['cool','gentle','husky'].includes(args.voice)?args.voice:'gentle');
    check();if(!job.id)throw Error('Voice service returned no job id');core.state.resources[peer+':voice:'+job.id]={peer,kind:'voice',id:job.id};core.persist();return job;
  }
  if(action==='image-generate'){
    if(peer!=='wxid_owner')throw Error('Image generation is owner-only');
    if(typeof args.text!=='string'||!args.text.trim()||args.text.length>4000)throw Error('Invalid image prompt');
    const job=await image.generate(args.text,args.selfPortrait!==false);check();core.state.resources[peer+':image:'+job.id]={peer,kind:'image',id:job.id};core.persist();return job;
  }
  if(!['sticker','voice','image'].includes(args.kind)||typeof args.resource!=='string')throw Error('Invalid media resource');
  let bytes,extension;
  if(args.kind==='sticker'){
    const row=stickerInventory().find(s=>s.id===args.resource);if(!row)throw Error('Unknown curated sticker');
    if(action==='media-status')return {status:'completed'};
    bytes=(await fetchStickerBuffer({...row,source:'manual'},8e6)).buffer;extension='.gif';
  }else{
    if(!core.state.resources[key])throw Error('Resource belongs to another conversation or was not created here');
    const job=args.kind==='voice'?await voice.status(args.resource):await image.imageStatus(args.resource);
    if(action==='media-status')return {id:job.id,status:job.status};
    if(job.status!=='completed')throw Error('Media is not ready');
    const root=fs.realpathSync(args.kind==='voice'?'__VOICE_ROOT__/qwen3/audio':image.MEDIA);
    const file=fs.realpathSync(job.file),relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Media escaped output folder');
    bytes=fs.readFileSync(file);extension=path.extname(file);if(bytes.length>30e6)throw Error('Media too large');
  }
  if(action!=='media-send')throw Error('Unknown media action');
  check();
  // A different resource can be sent after a previous uncertain attempt; never replay that attempt.
  if(core.state.outbox.filter(r=>r.peer===peer&&['queued','claimed'].includes(r.state)).length>=8)throw Error('Send queue full');
  // The queue idempotency key is fixed to the resource, not invented on retries.
  const requestId='media:'+args.kind+':'+args.resource;
  const previous=core.state.outbox.find(r=>r.peer===peer&&r.requestId===requestId);if(previous)return {id:previous.id,state:previous.state};
  const st=core.chat(peer);const id=crypto.randomUUID(),folder=path.join(core.dir,'outgoing',mediaScope(peer));fs.mkdirSync(folder,{recursive:true});
  const file=path.join(folder,id+extension);fs.writeFileSync(file,bytes);
  const row={id,requestId,peer,text:'['+args.kind+']',kind:args.kind==='voice'?'file':'image',file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),state:'queued',epoch:st.epoch,created:core.now()};
  core.state.outbox.push(row);core.persist();return {id,state:row.state};
}
