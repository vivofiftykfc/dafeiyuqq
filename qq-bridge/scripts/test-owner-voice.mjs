import fs from 'node:fs';
import {generate,status} from '../src/owner-voice.js';
const file='__VOICE_ROOT__/qwen3/clone-test-jobs.json';
let jobs;
if(fs.existsSync(file))jobs=JSON.parse(fs.readFileSync(file,'utf8'));
else{
 jobs=[];
 for(const voice of ['gentle','cool','husky']){
  jobs.push(await generate('我在呢，想说什么就慢慢说。',voice));
  fs.writeFileSync(file,JSON.stringify(jobs,null,2));
 }
}
for(let job of jobs){
 const deadline=Date.now()+600000;
 while(Date.now()<deadline){
  job=await status(job.id);
  if(job.status==='error')throw Error(JSON.stringify(job));
  if(job.status==='completed')break;
  await new Promise(r=>setTimeout(r,3000));
 }
 if(job.status!=='completed')throw Error('Timed out waiting for '+job.id);
 jobs=jobs.map(j=>j.id===job.id?job:j);
 fs.writeFileSync(file,JSON.stringify(jobs,null,2));
 console.log(JSON.stringify({voice:job.voice,id:job.id,file:job.file,seconds:job.seconds}));
}
console.log('All three reference voices generated new text successfully. No extra QQ messages sent.');
