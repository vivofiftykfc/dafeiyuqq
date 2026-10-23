import fs from 'node:fs';import path from 'node:path';import net from 'node:net';
import {spawn} from 'node:child_process';import {createHash,randomUUID} from 'node:crypto';
const ROOT=path.resolve(import.meta.dirname,'../..');
const WECHAT=path.join(ROOT,'wechat');
const hash=s=>createHash('sha256').update(s).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const port=p=>new Promise(resolve=>{const s=net.connect(p,'127.0.0.1');let done=false;const end=v=>{if(!done){done=true;s.destroy();resolve(v);}};s.setTimeout(700,()=>end(false));s.on('connect',()=>end(true));s.on('error',()=>end(false));});
export class Management {
 constructor(memory,summarize,{wechatRoot=WECHAT,ownerDir=path.join(ROOT,'qq-bridge/state/owner'),run=spawn}={}){Object.assign(this,{memory,summarize,wechatRoot,ownerDir,run});this.jobs=[];}
 job(kind,work){if(this.jobs.some(j=>j.state==='running'))throw Error('已有管理任务执行中，请稍候');const j={id:randomUUID(),kind,state:'running',started:Date.now()};this.jobs.unshift(j);this.jobs=this.jobs.slice(0,20);Promise.resolve().then(work).then(result=>Object.assign(j,{state:'completed',result,finished:Date.now()}),e=>Object.assign(j,{state:'failed',error:String(e.message).slice(0,1000),finished:Date.now()}));return j;}
 async status(){
  let state={state:'unknown'};try{state=read(path.join(this.wechatRoot,'runtime/wechat-bridge-state.json'));}catch{}
  let processAlive=false;try{const pid=Number(fs.readFileSync(path.join(this.wechatRoot,'runtime/wechat-bridge.pid'),'utf8'));if(Number.isInteger(pid)&&pid>0){process.kill(pid,0);processAlive=true;}}catch{}
  const services=await Promise.all([['微信聊天后台',18020],['微信媒体',18005],['主人操作服务',18004],['DSH',18031],['本地语音',18034],['生图',8188]].map(async([name,p])=>({name,port:p,up:await port(p)})));
  return {ok:true,wechat:{state:state.state,account:state.account,updated:state.time,error:state.error||'',processAlive,processCheck:'PID 存活检查；历史状态不是实时健康证明',routes:state.routes||{},lastImage:state.last_image_read||null},services,jobs:this.jobs,memory:{chats:this.memory.list().length,compacting:!!this.memory.compacting,schedule:'启动一分钟后及每小时检查；满80条或旧消息超过一天时整理，保留最近24条。'}};
 }
 control(action){if(!['Start','Stop'].includes(action))throw Error('未知微信操作');return this.job('微信'+action,()=>new Promise((resolve,reject)=>{
  const script=path.join(ROOT,'scripts/wechat-stack.ps1');
  const child=this.run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-Action',action],{windowsHide:true,cwd:ROOT,stdio:['ignore','pipe','pipe']});let output='';
  const collect=b=>{output=(output+b.toString()).slice(-6000);};child.stdout?.on('data',collect);child.stderr?.on('data',collect);
  child.on('error',reject);child.on('exit',code=>code===0?resolve({message:'脚本执行完成，请查看最新状态',output}):reject(Error(output||'脚本失败；请使用管理员一键启动入口')));
 }));}
 owner(){const file=path.join(this.ownerDir,'memory.json'),raw=fs.readFileSync(file,'utf8');return {facts:JSON.parse(raw).facts,revision:hash(raw)};}
 editFact({revision,index,fact,evidence='',action}){
  const file=path.join(this.ownerDir,'memory.json'),raw=fs.readFileSync(file,'utf8'),data=JSON.parse(raw);
  if(hash(raw)!==revision)throw Error('主人记忆已更新，请刷新');
  if(!['add','edit','remove'].includes(action))throw Error('未知操作');
  if(action!=='add'&&(!Number.isInteger(index)||index<0||index>=data.facts.length))throw Error('记忆不存在');
  if(action!=='remove'&&(typeof fact!=='string'||!fact.trim()||fact.length>2000||typeof evidence!=='string'||evidence.length>4000))throw Error('记忆内容格式错误');
  if(action==='remove')data.facts.splice(index,1);else if(action==='add')data.facts.push({fact,evidence,at:new Date().toISOString()});else data.facts[index]={...data.facts[index],fact,evidence};
  const backups=path.join(this.ownerDir,'memory-backups');fs.mkdirSync(backups,{recursive:true});fs.writeFileSync(path.join(backups,Date.now()+'-'+randomUUID()+'.json'),raw);
  const tmp=file+'.admin.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,file);return this.owner();
 }
 async handle(method,url,body={}){
  const route=url.pathname;
  if(route==='/api/manage/status'&&method==='GET')return this.status();
  if(route==='/api/manage/wechat'&&method==='POST')return {ok:true,job:this.control(body.action)};
  if(route==='/api/manage/owner-memory'){if(method==='GET')return {ok:true,...this.owner()};if(method==='POST')return {ok:true,...this.editFact(body)};}
  if(route==='/api/manage/memory'&&method==='GET')return {ok:true,chats:this.memory.list(url.searchParams.get('platform')||'')};
  if(route==='/api/manage/memory/detail'&&method==='POST')return {ok:true,...this.memory.detail(body.platform,body.account,body.peer,body.before)};
  if(route==='/api/manage/memory/archive'&&method==='POST')return {ok:true,messages:this.memory.archive(body.platform,body.account,body.peer,body.id)};
  if(route==='/api/manage/memory/summary'&&method==='POST'){this.memory.editSummary(body.platform,body.account,body.peer,body.summary,body.previous);return {ok:true};}
  if(route==='/api/manage/memory/compact'&&method==='POST'){
   const key=this.memory.key(body.platform,body.account,body.peer);this.memory.detail(body.platform,body.account,body.peer);
   if(this.memory.compacting)throw Error('记忆正在整理，请稍候');
   return {ok:true,job:this.job('整理指定会话记忆',async()=>({compressed:await this.memory.compact(this.summarize,{onlyKey:key,force:true})}))};
  }
  throw Error('未知管理接口');
 }
}
