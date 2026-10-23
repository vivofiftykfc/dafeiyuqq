import {randomBytes} from 'node:crypto';
import {safeFetch,validateFetchUrl} from './safe-fetch.js';
export class ApprovalRequired extends Error {constructor(id){super('网页已暂停，等待主人批准：'+id);this.id=id;}}
export function riskSignals(value){const u=new URL(value);const reasons=[];
 if(u.username||u.password)throw Error('不读取包含登录凭据的链接');
 if(!['http:','https:'].includes(u.protocol))throw Error('只支持公开网页');
 if(u.protocol==='http:')reasons.push('未加密HTTP');
 if(u.hostname.includes('xn--'))reasons.push('国际化域名，需核实是否仿冒');
 if(/\.(exe|msi|bat|cmd|ps1|scr|dll|apk|zip|rar)(?:$|\/)/i.test(u.pathname))reasons.push('下载或可执行文件链接');
 if(/(?:login|signin|wallet|checkout|payment|oauth)/i.test(u.pathname))reasons.push('登录、支付或账号页面');
 if([...u.searchParams.keys()].some(k=>/token|password|secret|auth|session|key/i.test(k)))throw Error('不读取含凭据参数的链接');
 return reasons;
}
export class RiskGate {
 constructor(store,{notify,fetcher=safeFetch,validate=validateFetchUrl}){Object.assign(this,{store,notify,fetcher,validate});}
 request(url,reason,desire){const db=this.store.db,now=this.store.now();const old=db.prepare("SELECT * FROM risks WHERE url=? AND expires>? AND state IN ('pending','approved','denied') ORDER BY created DESC LIMIT 1").get(url,now);if(old)return old;
  const id=randomBytes(4).toString('hex');db.prepare('INSERT INTO risks(id,url,reason,desire,state,created,expires) VALUES(?,?,?,?,?,?,?)').run(id,url,reason.slice(0,800),desire.slice(0,500),'pending',now,now+86400000);this.store.event('risk-request',{id,url,reason});return db.prepare('SELECT * FROM risks WHERE id=?').get(id);
 }
 decide(id,approve){const row=this.store.db.prepare('SELECT * FROM risks WHERE id=?').get(id);if(!row||row.state!=='pending'||row.expires<this.store.now())throw Error('申请不存在、已处理或已过期');this.store.db.prepare('UPDATE risks SET state=?,expires=? WHERE id=?').run(approve?'approved':'denied',this.store.now()+(approve?15*60000:86400000),id);this.store.event('risk-decision',{id,approve});return {ok:true,id,state:approve?'approved':'denied'};}
 async notifyPending(){if(!this.store.settings().enabled)return;const now=this.store.now(),h=new Date(now+8*3600000).getUTCHours();if(h<9||h>=23)return;
  const attempts=this.store.db.prepare("SELECT COUNT(*) n FROM events WHERE kind='risk-notification' AND at>?").get(now-86400000).n;if(attempts>=2)return;
  const row=this.store.db.prepare("SELECT * FROM risks WHERE state='pending' AND notified=0 AND expires>? ORDER BY created LIMIT 1").get(now);if(!row)return;
  this.store.db.prepare('UPDATE risks SET notified=1 WHERE id=?').run(row.id);this.store.event('risk-notification',{id:row.id});
  try{await this.notify(`我发现一个想看的网页，不过检测到风险，先停住了。\n网址：${row.url}\n风险：${row.reason}\n想看它是因为：${row.desire}\n如果同意仅这次只读查看，回复「允许访问 ${row.id}」；不想让我看就回复「拒绝访问 ${row.id}」。不回复我就不访问。批准不包含下载运行、登录或修改账号。`);}catch(e){this.store.event('risk-notification-uncertain',{id:row.id,error:e.message});}
 }
 async read(url,{risk='',desire='想了解网页内容'}={}){const grants=new Set();const initial=new URL(url).href;
  const gate=async value=>{const reasons=riskSignals(value);await this.validate(value);if(value===initial&&risk)reasons.push(risk);
   const known=this.store.db.prepare('SELECT reason FROM risks WHERE url=? ORDER BY created DESC LIMIT 1').get(value);if(known&&!reasons.length)reasons.push(known.reason);
   // An explicit previous request still gates the exact URL even if the next model omits its risk label.
   const previous=this.store.db.prepare("SELECT * FROM risks WHERE url=? AND state IN ('pending','approved','denied','using') AND expires>? ORDER BY created DESC LIMIT 1").get(value,this.store.now());
   if(!reasons.length&&!previous)return;
   if(previous?.state==='using'&&grants.has(previous.id))return;
   const row=previous||this.request(value,reasons.join('；'),desire);
   if(row.state==='approved'){if(!this.store.db.prepare("UPDATE risks SET state='using' WHERE id=? AND state='approved'").run(row.id).changes)throw Error('批准已被使用');grants.add(row.id);return;}
   await this.notifyPending();throw new ApprovalRequired(row.id);
  };
  try{await gate(initial);return await this.fetcher(initial,24000,{beforeRequest:gate});}
  finally{for(const id of grants)this.store.db.prepare("UPDATE risks SET state='used' WHERE id=? AND state='using'").run(id);}
 }
}
