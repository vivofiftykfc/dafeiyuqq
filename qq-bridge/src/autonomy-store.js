import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';import {randomInt,randomUUID} from 'node:crypto';
export const localDay=ms=>new Date(ms+8*3600000).toISOString().slice(0,10);
export const localHour=ms=>new Date(ms+8*3600000).getUTCHours();
export function awakeElapsed(start,end){let total=0;for(let t=start;t<end;){const next=Math.min(end,(Math.floor(t/3600000)+1)*3600000);if(localHour(t)>=9&&localHour(t)<23)total+=next-t;t=next;}return total;}
export class AutonomyStore {
 constructor(file,{now=Date.now,rng=randomInt}={}){
  this.now=now;this.rng=rng;fs.mkdirSync(path.dirname(file),{recursive:true});this.db=new DatabaseSync(file);
  this.db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY,data TEXT);
   CREATE TABLE IF NOT EXISTS days(day TEXT PRIMARY KEY,created INTEGER);
   CREATE TABLE IF NOT EXISTS activities(id TEXT PRIMARY KEY,day TEXT,due INTEGER,deadline INTEGER,kind TEXT,state TEXT,detail TEXT,updated INTEGER);
   CREATE TABLE IF NOT EXISTS destinations(id TEXT PRIMARY KEY,platform TEXT,account TEXT,peer TEXT,label TEXT,enabled INTEGER,owner INTEGER,kind TEXT);
   CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,at INTEGER,kind TEXT,data TEXT);
   CREATE TABLE IF NOT EXISTS shares(id TEXT PRIMARY KEY,activity TEXT,destination TEXT,hash TEXT UNIQUE,state TEXT,text TEXT,at INTEGER);
   CREATE TABLE IF NOT EXISTS risks(id TEXT PRIMARY KEY,url TEXT,reason TEXT,desire TEXT,state TEXT,created INTEGER,expires INTEGER,notified INTEGER DEFAULT 0);
   CREATE TABLE IF NOT EXISTS waits(id TEXT PRIMARY KEY,destination TEXT,sent INTEGER,due INTEGER,state TEXT,intensity REAL,followup TEXT);
   CREATE TABLE IF NOT EXISTS observations(id TEXT PRIMARY KEY,activity TEXT,kind TEXT,source TEXT,body TEXT,at INTEGER);
   CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY,v TEXT);`);
  this.db.prepare('INSERT OR IGNORE INTO settings VALUES(1,?)').run(JSON.stringify({enabled:false,phoneEnabled:true,minActivities:2,maxActivities:5,startHour:9,endHour:23,minGapMinutes:90,maxShares:3,qzoneLimit:1,followupEnabled:true}));
 }
 settings(){return JSON.parse(this.db.prepare('SELECT data FROM settings WHERE id=1').get().data);}
 configure(patch){const old=this.settings(),next={...old};for(const key of ['enabled','phoneEnabled','followupEnabled'])if(key in patch){if(typeof patch[key]!=='boolean')throw Error('开关必须是布尔值');next[key]=patch[key];}
  for(const [key,min,max] of [['minActivities',0,5],['maxActivities',0,5],['startHour',9,22],['endHour',10,23],['minGapMinutes',90,720],['maxShares',0,6],['qzoneLimit',0,2]])if(key in patch){if(!Number.isInteger(patch[key])||patch[key]<min||patch[key]>max)throw Error('配置超出范围：'+key);next[key]=patch[key];}
  if(next.startHour>=next.endHour||next.minActivities>next.maxActivities)throw Error('时间或次数范围无效');
  this.db.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify(next));if(!next.enabled)this.db.prepare("UPDATE activities SET state='cancelled',updated=? WHERE state='planned'").run(this.now());if(next.enabled&&!old.enabled)this.db.prepare("UPDATE activities SET state='planned' WHERE state='cancelled' AND due>?").run(this.now());return next;
 }
 event(kind,data){this.db.prepare('INSERT INTO events VALUES(?,?,?,?)').run(randomUUID(),this.now(),kind,JSON.stringify(data));}
 destinations(){return this.db.prepare('SELECT * FROM destinations ORDER BY owner DESC,label').all();}
 addDestination(d){this.db.prepare('INSERT OR IGNORE INTO destinations VALUES(?,?,?,?,?,?,?,?)').run(d.id,d.platform,d.account,d.peer,d.label,d.enabled?1:0,d.owner?1:0,d.kind||'private');}
 toggle(id,enabled){if(typeof enabled!=='boolean')throw Error('无效开关');if(!this.db.prepare('UPDATE destinations SET enabled=? WHERE id=?').run(enabled?1:0,id).changes)throw Error('只能选择已核验的联系人');this.event('destination-change',{id,enabled});}
 plan(extraKinds=[]){const c=this.settings(),now=this.now(),day=localDay(now);if(!c.enabled||this.db.prepare('SELECT 1 FROM days WHERE day=?').get(day))return;
  this.db.exec('BEGIN IMMEDIATE');try{if(!this.db.prepare('INSERT OR IGNORE INTO days VALUES(?,?)').run(day,now).changes){this.db.exec('COMMIT');return;}
   const midnight=Date.parse(day+'T00:00:00+08:00'),start=Math.max(now+5*60000,midnight+c.startHour*3600000),end=midnight+c.endHour*3600000-20*60000;
   const desired=this.rng(c.minActivities,c.maxActivities+1),slots=[];
   for(let tries=0;tries<200&&slots.length<desired&&end>start;tries++){const at=this.rng(Math.ceil(start),Math.floor(end)+1);if(slots.every(t=>Math.abs(t-at)>=c.minGapMinutes*60000))slots.push(at);}
   for(const at of slots.sort((a,b)=>a-b)){const kinds=[...(c.phoneEnabled?['web','phone','create','reflect','checkin']:['web','create','reflect','checkin']),...extraKinds.filter(k=>['bilibili','zhihu'].includes(k))];this.db.prepare('INSERT INTO activities VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),day,at,at+this.rng(5,21)*60000,kinds[this.rng(0,kinds.length)],'planned','{}',now);}
   this.db.exec('COMMIT');this.event('planned',{day,count:slots.length});
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 claim(){const c=this.settings(),now=this.now();if(!c.enabled||localHour(now)<c.startHour||localHour(now)>=c.endHour)return null;
  this.db.prepare("UPDATE activities SET state='missed',updated=? WHERE state='planned' AND deadline<?").run(now,now);
  const r=this.db.prepare("SELECT * FROM activities WHERE state='planned' AND due<=? AND deadline>? ORDER BY due LIMIT 1").get(now,now);if(!r)return null;
  return this.db.prepare("UPDATE activities SET state='running',updated=? WHERE id=? AND state='planned'").run(now,r.id).changes?r:null;
 }
 finish(id,state,detail={}){this.db.prepare('UPDATE activities SET state=?,detail=?,updated=? WHERE id=?').run(state,JSON.stringify(detail),this.now(),id);this.event('activity-'+state,{id,...detail});}
 recover(){this.db.prepare("UPDATE activities SET state='interrupted',updated=? WHERE state='running'").run(this.now());this.db.prepare("UPDATE shares SET state='uncertain' WHERE state='sending'").run();this.db.prepare("UPDATE risks SET state='interrupted' WHERE state='using'").run();}
 status(){return {settings:this.settings(),destinations:this.destinations(),activities:this.db.prepare('SELECT * FROM activities ORDER BY due DESC LIMIT 30').all(),risks:this.db.prepare('SELECT * FROM risks ORDER BY created DESC LIMIT 30').all(),waits:this.db.prepare('SELECT * FROM waits ORDER BY sent DESC LIMIT 30').all(),events:this.db.prepare('SELECT * FROM events ORDER BY at DESC LIMIT 40').all().map(r=>({...r,data:JSON.parse(r.data)}))};}
 close(){this.db.close();}
}
