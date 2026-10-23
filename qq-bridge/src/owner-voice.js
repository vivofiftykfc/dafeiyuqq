import fs from 'node:fs';
import path from 'node:path';
import {guard,onebot,OWNER} from './owner-services.js';
const ROOT='__VOICE_ROOT__/qwen3';
async function request(route,body){
 guard();
 const token=fs.readFileSync(path.join(ROOT,'access-token.txt'),'utf8').trim();
 const r=await fetch('http://127.0.0.1:18034'+route,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
 const value=await r.json();if(!r.ok)throw Error(value.error||'Voice service error');return value;
}
export async function voices(){const available=await request('/voices');const preferences=JSON.parse(fs.readFileSync(path.join(ROOT,'preferences.json'),'utf8'));return {defaultVoice:preferences.defaultVoice,pinnedVoices:preferences.pinnedVoices,voices:available};}
export const generate=(text,voice)=>request('/generate',{text,voice});
export function status(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid job ID');return request('/jobs/'+id);}
export async function send(id){
 const job=await status(id);if(job.status!=='completed')throw Error('Voice generation is not completed');
 const base=fs.realpathSync(path.join(ROOT,'audio')),file=fs.realpathSync(job.file);
 if(path.relative(base,file)!==id+'.wav')throw Error('Only generated audio is allowed');
 const marker=path.join(ROOT,'jobs',id+'.send.json');
 if(fs.existsSync(marker))throw Error('This audio was already sent or attempted; inspect QQ before retrying.');
 fs.writeFileSync(marker,JSON.stringify({status:'attempted',at:new Date().toISOString()}));
 const result=await onebot('send_private_msg',{user_id:Number(OWNER),message:[{type:'record',data:{file:'base64://'+fs.readFileSync(file).toString('base64')}}]});
 fs.writeFileSync(marker,JSON.stringify({status:'sent',result}));return result;
}
