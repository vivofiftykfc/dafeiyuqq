import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DATA,MEDIA,guard,onebot} from './owner-services.js';
const file=path.join(DATA,'self-development.json');
export function read(){guard();return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{revision:0,preferences:[],viewpoints:[],expression:[],evidence:'尚未形成新的偏好'};}
export function update({preferences,viewpoints,expression,evidence}){
 const old=read();const dir=path.join(DATA,'self-development-history');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,`${Date.now()}-${crypto.randomUUID()}.json`),JSON.stringify(old,null,2));
 const next={revision:old.revision+1,at:new Date().toISOString(),preferences,viewpoints,expression,evidence};
 const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(next,null,2));fs.renameSync(temp,file);
 return {saved:true,...next};
}
export async function profileRead(){guard();return onebot('get_stranger_info',{user_id:10000002,no_cache:true});}
export async function profileUpdate({nickname,signature,avatarFile,reason}){
 guard();if(nickname===undefined&&signature===undefined&&!avatarFile)throw Error('No profile fields provided');
 let avatar;
 if(avatarFile){const real=fs.realpathSync(avatarFile),base=fs.realpathSync(MEDIA),rel=path.relative(base,real);if(!rel||rel.startsWith('..')||path.isAbsolute(rel)||!real.endsWith('.png'))throw Error('Avatar must be a generated PNG in the bot image library');if(fs.statSync(real).size>10*1024*1024)throw Error('Avatar too large');avatar=real;}
 const before=await profileRead();const log=path.join(DATA,'qq-profile-history.jsonl'),id=crypto.randomUUID();
 fs.appendFileSync(log,JSON.stringify({id,at:new Date().toISOString(),phase:'attempt',before,requested:{nickname,signature,avatarFile},reason})+'\n');
 // Identity is rechecked by onebot before each call. Never accept a target account argument.
 try{
  if(nickname!==undefined||signature!==undefined)await onebot('set_qq_profile',{...(nickname===undefined?{}:{nickname}),...(signature===undefined?{}:{personal_note:signature})});
  if(avatar)await onebot('set_qq_avatar',{file:'base64://'+fs.readFileSync(avatar).toString('base64')});
  const after=await profileRead();fs.appendFileSync(log,JSON.stringify({id,at:new Date().toISOString(),phase:'returned',after})+'\n');
  return {apiAccepted:true,after,avatarVisuallyVerified:false};
 }catch(e){fs.appendFileSync(log,JSON.stringify({id,at:new Date().toISOString(),phase:'unknown_or_failed',error:e.message})+'\n');throw Error('Profile update failed or outcome unknown. Read profile before any retry: '+e.message);}
}
