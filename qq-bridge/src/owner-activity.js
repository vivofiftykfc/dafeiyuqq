import fs from 'node:fs';
import path from 'node:path';
const dayOf=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
function tail(file,limit=1024*1024){
 if(!fs.existsSync(file))return '';
 const fd=fs.openSync(file,'r');try{const size=fs.fstatSync(fd).size,start=Math.max(0,size-limit),buf=Buffer.alloc(size-start);fs.readSync(fd,buf,0,buf.length,start);const s=buf.toString('utf8');return start?s.slice(s.indexOf('\n')+1):s;}finally{fs.closeSync(fd);}
}
const lines=file=>tail(file).split(/\r?\n/).filter(Boolean).flatMap(s=>{try{return [JSON.parse(s)];}catch{return [];}});
const json=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}};
export function screenshotFile(base,id){
 if(typeof id!=='string'||!/^[-\w.]+\.(png|jpg|jpeg)$/i.test(id)||path.basename(id)!==id)throw Error('Invalid screenshot id');
 const root=fs.realpathSync(path.join(base,'phone-shots')),file=fs.realpathSync(path.join(root,id));
 const rel=path.relative(root,file);if(rel.startsWith('..')||path.isAbsolute(rel)||!fs.statSync(file).isFile())throw Error('Invalid screenshot path');
 return file;
}
export function ownerActivity(base,day=dayOf(Date.now())){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)throw Error('Invalid date');
 const previous=new Date(Date.parse(day)-86400000).toISOString().slice(0,10);
 const raw=[...lines(path.join(base,'phone-history',previous+'.jsonl')),...lines(path.join(base,'phone-history',day+'.jsonl'))];
 const inDay=t=>{try{return dayOf(t)===day;}catch{return false;}};
 const shots=[];const shotDir=path.join(base,'phone-shots');
 if(fs.existsSync(shotDir))for(const id of fs.readdirSync(shotDir)){
  if(!/\.(png|jpe?g)$/i.test(id))continue;
  try{const file=screenshotFile(base,id),s=fs.statSync(file);if(inDay(s.mtimeMs))shots.push({id,at:new Date(s.mtimeMs).toISOString(),bytes:s.size});}catch{}
 }
 shots.sort((a,b)=>b.at.localeCompare(a.at));
 const known=new Set(shots.map(s=>s.id));
 const refs=value=>{const s=typeof value==='string'?value:JSON.stringify(value);return [...known].filter(id=>s?.includes(id));};
 const operations=new Map();
 for(const row of raw){if(!row.id||!inDay(row.at))continue;let op=operations.get(row.id);if(!op){op={id:row.id,kind:'operation',at:row.at,title:row.tool,status:'unknown',shots:[]};operations.set(row.id,op);}
  op.updatedAt=row.at;op.shots=[...new Set([...op.shots,...refs(row.content)])];
  if(row.phase==='requested'){op.args=row.args;op.status='pending';}
  else if(row.phase==='result'){op.status=row.isError?'failed':'completed';op.result=row.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n');}
  else if(row.phase==='error'){op.status='failed';op.result=row.error;}
 }
 const observations=lines(path.join(base,'observations.jsonl')).filter(r=>inDay(r.at)).map((r,i)=>({id:'observation-'+i,kind:'observation',at:r.at,title:r.source,body:r.summary,thought:r.thought,visibility:r.visibility,evidence:r.evidence,shots:refs(r)}));
 const outgoing=json(path.join(base,`douyin-outgoing-${day}.json`),{});
 const autoMessages=lines(path.join(base,'douyin-auto.jsonl')).filter(r=>inDay(r.at)).map((r,i)=>({id:'douyin-auto-'+i,kind:['sent','incoming','uncertain'].includes(r.type)?'message':'operation',at:r.at,title:'抖音自动聊天 · '+(r.friend||'控制台')+' · '+r.type,body:r.text||r.note||r.error||'',status:r.type,shots:refs(r.screenshot)}));
 const messages=(outgoing.messages||[]).map((r,i)=>{const m=String(r.sentAt||'').match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?/);return {id:'douyin-'+i,kind:'message',at:m?m[0].replace(' ','T')+(m[0].length===16?':00':'')+'+08:00':day+'T00:00:00+08:00',title:'抖音 → '+r.to,body:r.text,status:r.verified?'verified':'unverified',account:outgoing.account?.publicNickname,shots:refs(r.verifyShot)};});
 for(const [i,r] of json(path.join(base,'discovery-shares.json'),[]).entries())if(inDay(r.at))messages.push({id:'discovery-'+i,kind:'message',at:new Date(r.at).toISOString(),title:r.channel==='private'?'QQ → 主人私聊':'QQ 空间',body:r.content,source:r.sourcePage,status:r.status==='sent'?'sent':r.status,shots:[]});
 const diaries=lines(path.join(base,'diary','index.jsonl')).filter(r=>r.day===day).map((r,i)=>({id:'diary-'+i,kind:'diary',at:new Date(r.t).toISOString(),title:r.title||'日记',body:r.text,thought:r.mood,shots:[]}));
 const events=[...operations.values(),...observations,...messages,...autoMessages,...diaries].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,500);
 return {day,timezone:'Asia/Shanghai',updatedAt:new Date().toISOString(),counts:{operations:operations.size,observations:observations.length,messages:messages.length,diaries:diaries.length},latest:raw.filter(r=>inDay(r.at)).at(-1)||null,events,shots:shots.slice(0,100),limitNote:'最近 500 条记录；操作日志每个源文件最多读取末尾 1 MB。未返回不等于仍在运行。'};
}
