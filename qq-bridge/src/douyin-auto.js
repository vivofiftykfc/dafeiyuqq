import fs from 'node:fs';
import path from 'node:path';
import {FRIENDS,ACCOUNT,newMessages} from './douyin-ui.js';
import {acquirePhone} from './phone-lease.js';
import {DouyinPhone} from './douyin-phone.js';
import {DouyinModel} from './douyin-model.js';
export class DouyinAuto {
  constructor(dir,{phone,model,lease=acquirePhone,interval=5000}={}) {
    this.dir=dir;this.phone=phone;this.model=model;this.lease=lease;this.interval=interval;
    this.friends=[...FRIENDS];this.enabled=false;this.epoch=0;this.busy=false;this.phase='已关闭';this.lastError='';this.lastPoll=null;this.currentFriend='';this.previous=new Map();this.history=new Map();this.index=0;
    fs.mkdirSync(dir,{recursive:true});this.logFile=path.join(dir,'douyin-auto.jsonl');
    this.historyFile=path.join(dir,'douyin-chat-history.json');
    try{const saved=JSON.parse(fs.readFileSync(this.historyFile,'utf8'));for(const friend of FRIENDS)if(Array.isArray(saved[friend]))this.history.set(friend,saved[friend].filter(m=>['in','out'].includes(m.direction)&&typeof m.text==='string').slice(-24));}catch{}
  }
  saveHistory(){const tmp=this.historyFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(Object.fromEntries(this.history),null,2));fs.renameSync(tmp,this.historyFile);}
  record(type,data={}){fs.appendFileSync(this.logFile,JSON.stringify({at:new Date().toISOString(),type,...data})+'\n');}
  status(){let events=[];try{const f=fs.openSync(this.logFile,'r');try{const size=fs.fstatSync(f).size,b=Buffer.alloc(Math.min(size,128000));fs.readSync(f,b,0,b.length,Math.max(0,size-b.length));events=b.toString('utf8').split('\n').flatMap(l=>{try{return [JSON.parse(l)];}catch{return [];}}).slice(-80).reverse();}finally{fs.closeSync(f);}}catch{}
    return {ok:true,enabled:this.enabled,busy:this.busy,phase:this.phase,lastError:this.lastError,lastPoll:this.lastPoll,currentFriend:this.currentFriend,friends:this.friends,account:ACCOUNT,baselineCount:this.previous.size,intervalSeconds:this.interval/1000,events};
  }
  start(friends=FRIENDS){if(!Array.isArray(friends)||!friends.length||friends.some(f=>!FRIENDS.includes(f))||new Set(friends).size!==friends.length)throw Error('只能选择已授权的5位好友');if(this.enabled)return this.status();if(this.busy)throw Error('上一次任务正在收尾，请稍后开启');this.friends=[...friends];this.phone??=new DouyinPhone(this.dir);this.model??=new DouyinModel(this.dir);this.enabled=true;this.epoch++;this.abort=new AbortController();this.previous.clear();this.index=0;this.lastError='';this.phase='正在建立基线（不回复旧消息）';this.record('start');this.timer=setTimeout(()=>this.tick(),0);return this.status();}
  stop(){this.enabled=false;this.epoch++;clearTimeout(this.timer);this.abort?.abort(Error('控制台已关闭自动回复'));this.phase=this.busy?'已关闭，正在取消未发送回复':'已关闭';this.record('stop');return this.status();}
  async tick(){
    if(!this.enabled||this.busy)return;
    const epoch=this.epoch,signal=this.abort.signal;this.busy=true;let release;
    const active=()=>{signal.throwIfAborted();if(!this.enabled||epoch!==this.epoch)throw Error('自动回复已关闭');};
    try {
      release=this.lease(this.dir,'抖音自动回复');active();
      await this.phone.verifyAccount(signal);
      const friend=this.friends[this.index++%this.friends.length];this.currentFriend=friend;this.phase='检查 '+friend;
      const snap=await this.phone.open(friend,signal);active();this.lastPoll=new Date().toISOString();
      const delta=newMessages(this.previous.get(friend),snap.messages);
      this.previous.set(friend,snap.messages);
      if(delta.baseline){this.history.set(friend,[...(this.history.get(friend)||[]),...snap.messages].slice(-24));this.saveHistory();this.record('baseline',{friend,note:'建立或重新同步基线；当前可见消息不回复'});return;}
      if(!delta.messages.length||snap.messages.at(-1)?.direction!=='in')return;
      const incoming=delta.messages.filter(m=>m.direction==='in');if(!incoming.length)return;
      if(!incoming.some(m=>m.kind==='text')){this.record('skipped',{friend,note:'新消息只有媒体，未猜测内容或自动回复'});return;}
      active();this.record('incoming',{friend,text:incoming.map(m=>m.text).join('\n'),screenshot:await this.phone.screenshot(friend,signal)});
      this.phase='正在回复 '+friend;
      const history=this.history.get(friend)||[];
      const context=[...history,...delta.messages].slice(-24);
      this.history.set(friend,context);this.saveHistory();
      const reply=await this.model.reply(friend,context,signal);active();
      let commit=false;
      try {
        const result=await this.phone.send(friend,reply,snap.messages,signal,()=>{active();this.record('sending',{friend,text:reply});commit=true;});
        this.previous.set(friend,result.messages);this.history.set(friend,[...context,{direction:'out',kind:'text',text:reply}].slice(-24));this.saveHistory();
        this.record('sent',{friend,text:reply,screenshot:result.screenshot});
      }catch(e){if(commit)this.record('uncertain',{friend,text:reply,note:'发送已开始，结果未确认，不会重试'});throw e;}
    }catch(e){
      if(e.code==='CHAT_CHANGED'){this.record('superseded',{friend:this.currentFriend,note:'生成期间收到新消息，丢弃旧回复，下一轮重新处理'});}
      else if(!signal.aborted){this.lastError=e.message;this.record('error',{friend:this.currentFriend,error:e.message});
        // A phone lease conflict is transient; every other uncertainty pauses sending.
        if(e.message.startsWith('手机正在被使用'))this.phase=e.message;
        else {this.enabled=false;this.epoch++;this.phase='已暂停：'+e.message;this.abort.abort(e);}
      }
    }finally{
      release?.();this.busy=false;
      if(this.enabled){this.phase='等待下一次检查';this.timer=setTimeout(()=>this.tick(),this.interval);this.timer.unref?.();}
      else if(signal.aborted&&!this.lastError)this.phase='已关闭';
    }
  }
}
