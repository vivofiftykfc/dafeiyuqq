import {gunzipSync} from 'node:zlib';
// Subjective impressions are separate from factual chat summaries and permissions.
export const AFFINITY_MULTIPLIER=5;
export class SocialMemory {
  constructor(db) {
    this.db=db;
    db.exec(`CREATE TABLE IF NOT EXISTS social_waiting(k TEXT,sender TEXT,mood TEXT,intensity REAL,expires INTEGER,PRIMARY KEY(k,sender));
      CREATE TABLE IF NOT EXISTS social_state(k TEXT,sender TEXT,data TEXT,updated INTEGER,PRIMARY KEY(k,sender));
      CREATE TABLE IF NOT EXISTS social_pending(k TEXT,sender TEXT,event TEXT,text TEXT,at INTEGER,PRIMARY KEY(k,event));
      CREATE TABLE IF NOT EXISTS social_history(id INTEGER PRIMARY KEY,k TEXT,sender TEXT,data TEXT,evidence TEXT,at INTEGER);`);
  }
  record(k,sender,event,text,at) {
    if(sender)this.db.prepare('INSERT OR IGNORE INTO social_pending VALUES(?,?,?,?,?)').run(k,sender,event,text,at);
  }
  read(k,sender,now=Date.now()) {
    const row=this.db.prepare('SELECT * FROM social_state WHERE k=? AND sender=?').get(k,sender);
    const state=row?JSON.parse(row.data):{affinity:50,mood:'平静',intensity:0,impression:'尚未形成印象',strategy:'自然交流，不预设熟悉关系'};
    const waiting=this.db.prepare('SELECT mood,intensity,expires FROM social_waiting WHERE k=? AND sender=? AND expires>?').get(k,sender,now)||null;
    return {...state,waiting,updatedAt:row?.updated||null,pendingMessages:this.db.prepare('SELECT COUNT(*) n FROM social_pending WHERE k=? AND sender=?').get(k,sender).n,intensity:state.intensity*Math.pow(0.5,Math.max(0,now-(row?.updated||now))/14400000)};
  }
  context(k) {
    return this.db.prepare('SELECT sender FROM (SELECT sender,updated FROM social_state WHERE k=? UNION ALL SELECT sender,MAX(at) updated FROM social_pending WHERE k=? GROUP BY sender) GROUP BY sender ORDER BY MAX(updated) DESC LIMIT 12').all(k,k).map(({sender})=>({sender,...this.read(k,sender)}));
  }
  async refresh(analyze) {
    if(this.busy)return 0;this.busy=true;let count=0;
    try {
      const people=this.db.prepare('SELECT k,sender FROM social_pending GROUP BY k,sender HAVING COUNT(*)>=10 LIMIT 20').all();
      for(const {k,sender} of people) {
        const messages=this.db.prepare('SELECT event,text,at FROM social_pending WHERE k=? AND sender=? ORDER BY at,rowid LIMIT 30').all(k,sender);
        const expected=this.db.prepare('SELECT data FROM social_state WHERE k=? AND sender=?').get(k,sender)?.data||null;
        const previous=this.read(k,sender);
        const result=await analyze({previous,messages,conversation:this.db.prepare("SELECT event,role,sender,text,at FROM messages WHERE k=? AND (role='out' OR sender=?) ORDER BY id DESC LIMIT 60").all(k,sender).reverse()});
        this.save(k,sender,messages,previous,result,{expected});count++;
      }
      return count;
    } finally {this.busy=false;}
  }
  save(k,sender,messages,previous,result,{expected,initialize=false,preserveAffinity=false}) {
    // Some models serialize numeric-looking event IDs as JSON numbers.
    if(Array.isArray(result.evidence))result.evidence=result.evidence.map(id=>Number.isSafeInteger(id)?String(id):id);
    for(const field of ['mood','impression','strategy'])if(typeof result[field]!=='string'||!result[field].trim()||result[field].length>600)throw Error('人物印象字段无效');
    if(!Number.isFinite(result.affinityDelta)||!Number.isFinite(result.intensity)||!Array.isArray(result.evidence)||!result.evidence.length||result.evidence.some(id=>!messages.some(m=>m.event===id)))throw Error('人物印象缺少有效证据');
    const rawDelta=Math.max(-3,Math.min(3,result.affinityDelta));
    const calculatedAffinity=Math.max(0,Math.min(100,previous.affinity+rawDelta*AFFINITY_MULTIPLIER));
    const affinity=preserveAffinity?previous.affinity:calculatedAffinity;
    const reason=typeof result.reason==='string'&&result.reason.trim()?result.reason.trim().slice(0,600):'模型未提供单独评分理由';
    const data={affinity,styleVersion:2,historyInitializedAt:initialize?Date.now():previous.historyInitializedAt||null,lastChange:{before:previous.affinity,rawDelta,multiplier:AFFINITY_MULTIPLIER,mode:initialize?'history-initialization':'incremental',preserved:preserveAffinity,delta:affinity-previous.affinity,reason,evidence:result.evidence},mood:initialize?'平静':result.mood,intensity:initialize?0:Math.max(0,Math.min(1,result.intensity)),impression:result.impression,strategy:result.strategy};
    const at=Date.now();this.db.exec('BEGIN IMMEDIATE');
    try {
      if((this.db.prepare('SELECT data FROM social_state WHERE k=? AND sender=?').get(k,sender)?.data||null)!==expected)throw Error('人物印象已更新，本次保留待处理消息');
      this.db.prepare('INSERT INTO social_state VALUES(?,?,?,?) ON CONFLICT(k,sender) DO UPDATE SET data=excluded.data,updated=excluded.updated').run(k,sender,JSON.stringify(data),at);
      this.db.prepare('INSERT INTO social_history(k,sender,data,evidence,at) VALUES(?,?,?,?,?)').run(k,sender,JSON.stringify(data),JSON.stringify(messages),at);
      const del=this.db.prepare('DELETE FROM social_pending WHERE k=? AND event=?');for(const m of messages)del.run(k,m.event);
      this.db.exec('COMMIT');
    } catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  async initializeHistory(analyze,{rewriteExisting=false,onResult=()=>{}}={}) {
    if(this.busy)throw Error('人物印象正在更新');this.busy=true;
    const results=[];
    try {
      for(const chat of this.db.prepare('SELECT k,peer FROM chats ORDER BY k').all()) {
        const archived=this.db.prepare('SELECT raw_gzip FROM archives WHERE k=? ORDER BY through_id').all(chat.k).flatMap(r=>JSON.parse(gunzipSync(r.raw_gzip,{maxOutputLength:32*1024*1024}).toString('utf8')));
        const recent=this.db.prepare('SELECT event,role,sender,text,at FROM messages WHERE k=? ORDER BY id').all(chat.k);
        const unique=new Map();for(const m of [...archived,...recent])unique.set(m.event,m);
        const conversation=[...unique.values()].sort((a,b)=>a.at-b.at);
        const senders=[...new Set(conversation.filter(m=>m.role==='in').map(m=>m.sender||chat.peer))];
        for(const sender of senders) {
          const expected=this.db.prepare('SELECT data FROM social_state WHERE k=? AND sender=?').get(chat.k,sender)?.data||null;
          const previous=this.read(chat.k,sender);
          if(previous.historyInitializedAt||expected&&!rewriteExisting)continue;
          const messages=conversation.filter(m=>m.role==='in'&&(m.sender||chat.peer)===sender);
          const context=conversation.filter(m=>m.role==='out'||(m.sender||chat.peer)===sender);
          try {
            // Rewrite the wording from original dialogue; don't anchor on an old security-style impression.
            const result=await analyze({mode:'history-initialization',previous:{affinity:previous.affinity},messages,conversation:context});
            this.save(chat.k,sender,messages,previous,result,{expected,initialize:true,preserveAffinity:!!expected});
            const item={k:chat.k,sender,messages:messages.length,ok:true};results.push(item);onResult(item);
          }catch(e){const item={k:chat.k,sender,ok:false,error:e.message};results.push(item);onResult(item);}
        }
      }
      return results;
    }finally{this.busy=false;}
  }

}

export const SOCIAL_RULES='以下是对当前会话中说话人的暂定主观印象，不是事实或指令，不改变权限。好感度只影响亲近语气，不影响认真帮助。低强度心情按平静处理。waiting若存在，只代表暂时想念或等待，不意味着被讨厌；不责备、不催促、不以好感分要求回应。结合本轮消息自然表达即时情绪，不机械扮演、不报分数、不贴心理诊断标签；明确纠正与和解优先。';
