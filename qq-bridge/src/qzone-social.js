import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {onebot,guard,DATA,BOT} from './owner-services.js';
const stateFile=path.join(DATA,'qzone-social.json');
const load=()=>fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{ack:[],actions:[]};
const save=s=>{fs.writeFileSync(stateFile+'.tmp',JSON.stringify(s,null,2));fs.renameSync(stateFile+'.tmp',stateFile);};
export function commentEvents(posts,details){
 const out=[];
 posts.forEach((post,i)=>{
  const add=(c,parent='')=>{if(String(c.uin)!==BOT&&c.comment_id)out.push({id:`${post.tid}:${parent}:${c.comment_id}:${c.uin}`,tid:post.tid,post:post.content,comment_id:c.comment_id,parent_comment_id:parent,author:c.name,uin:c.uin,time:c.time,content:c.content});};
  for(const c of details[i].comments||[]){add(c);for(const reply of c.replies||[])add(reply,c.comment_id);}
 });return out;
}
export async function poll(){
 guard();const p=await onebot('get_qzone_msg_list',{num:10});
 const details=[];for(const post of p.msglist)details.push(await onebot('get_qzone_msg_detail',{tid:post.tid,num:50}));
 const s=load();const pending=commentEvents(p.msglist,details).filter(e=>!s.ack.includes(e.id));
 return {pending,scope:'Latest 10 own posts, first 50 comments each; inline replies may be incomplete. Not an instant notification inbox.'};
}
export function acknowledge(ids){guard();const s=load();s.ack=[...new Set([...s.ack,...ids])];save(s);return {acknowledged:ids.length};}
export async function feeds(){guard();return onebot('get_qzone_feeds',{count:10});}
export async function posts(target=BOT){guard();return onebot('get_qzone_msg_list',{target_uin:Number(target),num:10});}
export async function detail(tid,target=BOT){guard();return onebot('get_qzone_msg_detail',{tid,target_uin:Number(target),num:50});}
export async function interact(kind,tid,target,content='',eventId=''){
 guard();if(!['comment','like'].includes(kind))throw Error('Unknown interaction');
 if(kind==='comment'&&(!content.trim()||content.length>600))throw Error('Use 1-600 characters');
 // Confirm the post exists and is readable before interacting; feed keys are not always tids.
 await detail(tid,target);
 if(eventId){const inbox=await poll();if(!inbox.pending.some(e=>e.id===eventId&&e.tid===tid))throw Error('Comment event is no longer pending');if(String(target)!==BOT)throw Error('Inbox reply must target own post');}
 const s=load();const key=crypto.createHash('sha256').update(JSON.stringify([kind,tid,target,eventId||content])).digest('hex');
 if(s.actions.some(x=>x.key===key))throw Error('Already attempted this interaction. Check the post; do not retry blindly.');
 const recent=s.actions.filter(x=>Date.now()-x.at<86400000);
 if(recent.length>=20||recent.some(x=>Date.now()-x.at<10000))throw Error('Interaction frequency limit; do not spam');
 const row={key,kind,tid,target,content,eventId,at:Date.now(),status:'pending'};s.actions.push(row);save(s);
 try{
  const result=await onebot(kind==='comment'?'comment_qzone':'like_qzone',{tid,target_uin:Number(target),...(kind==='comment'?{content}:{})});
  const latest=load();Object.assign(latest.actions.find(x=>x.key===key),{status:'sent',result});if(eventId)latest.ack=[...new Set([...latest.ack,eventId])];save(latest);
  return {sent:true,result,threadedReply:false};
 }catch(e){const latest=load();latest.actions.find(x=>x.key===key).status='failed-or-unknown';save(latest);throw e;}
}
