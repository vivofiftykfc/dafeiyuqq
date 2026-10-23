// Transport-independent real-time gate. No historical-message replay or send retries.
export class DirectReplyQueue {
  constructor({model,send,record=()=>{},save=()=>{},history=new Map(),debounce=1200,loadContext}) {
    Object.assign(this,{model,send,record,save,history,debounce,loadContext});
    this.enabled=false;this.epoch=0;this.seen=new Set();this.jobs=new Map();this.allowed=new Map();
  }
  start(allowed,accountUid){
    this.stop();this.allowed=new Map(allowed);this.accountUid=accountUid;
    this.since=Date.now();this.enabled=true;this.abort=new AbortController();
  }
  stop(){this.enabled=false;this.epoch++;this.abort?.abort();for(const j of this.jobs.values())clearTimeout(j.timer);this.jobs.clear();}
  receive(message){
    const {uid,id,time,text,kind='text',accountUid}=message;
    if(!this.enabled||accountUid!==this.accountUid||!this.allowed.has(uid)||!id||!Number.isFinite(time)||time<this.since||uid===accountUid)return false;
    const key=accountUid+':'+uid+':'+id;if(this.seen.has(key))return false;
    this.seen.add(key);if(this.seen.size>10000)this.seen.delete(this.seen.values().next().value);
    const friend=this.allowed.get(uid);
    if(kind!=='text'||typeof text!=='string'||!text.trim()){this.record('skipped',{friend,note:'媒体消息暂不自动解读'});return false;}
    const context=[...(this.history.get(friend)||[]),{direction:'in',kind:'text',text}].slice(-24);
    this.history.set(friend,context);this.save();this.record('incoming',{friend,text,id,transport:'direct'});
    let job=this.jobs.get(uid);if(!job){job={version:0,running:false,images:[]};this.jobs.set(uid,job);}job.version++;
    job.images.push(...(message.images||[]));
    clearTimeout(job.timer);if(!job.running)job.timer=setTimeout(()=>void this.run(uid,job),this.debounce);
    return true;
  }
  async run(uid,job){
    if(!this.enabled||this.jobs.get(uid)!==job)return;
    const epoch=this.epoch,version=job.version,signal=this.abort.signal,friend=this.allowed.get(uid);
    const active=()=>this.enabled&&epoch===this.epoch&&!signal.aborted&&this.jobs.get(uid)===job;
    job.running=true;
    try {
      const images=[...job.images];
      const sessionKey=JSON.stringify(['douyin',this.accountUid,uid]);
      let reply;
      for(let attempt=0;attempt<2;attempt++){
        try{reply=await this.model.reply(friend,this.loadContext?this.loadContext(uid):[...(this.history.get(friend)||[])],signal,null,images,{key:sessionKey});break;}
        catch(e){
          if(!active()||job.version!==version)return;
          await this.model.discard?.(sessionKey);
          if(attempt===1)throw e;
          this.record('generation-retry',{friend,note:'生成失败，尚未发送；重建会话后仅重试一次',error:e.message});
        }
      }
      if(!active()||job.version!==version){await this.model.discard?.(sessionKey);return;}
      this.record('sending',{friend,text:reply,transport:'direct'});
      // Once handed to the network, uncertainty is not retried.
      try{const delivered=await this.send(uid,reply,()=>active()&&job.version===version);if(delivered===null){await this.model.discard?.(sessionKey);return;}if(typeof delivered==='string')reply=delivered;}
      catch(e){
        await this.model.discard?.(sessionKey);
        if(e.beforeSend){this.record('generation-error',{friend,error:e.message,note:'媒体准备失败，未调用发送接口；其他好友继续工作'});job.images=[];return;}
        this.record('uncertain',{friend,note:'协议发送未确认，已暂停；不会重试',error:e.message});this.stop();return;
      }
      job.images.splice(0,images.length);
      this.history.set(friend,[...(this.history.get(friend)||[]),{direction:'out',kind:'text',text:reply}].slice(-24));this.save();
      this.record('sent',{friend,text:reply,transport:'direct',note:'服务端确认接收；不代表对方已读'});
    }catch(e){if(active()){this.record('generation-error',{friend,error:e.message,note:'本轮未发送；其他好友继续工作，后续新消息可重试'});job.images=[];}}
    finally {job.running=false;if(active()&&job.version!==version)job.timer=setTimeout(()=>void this.run(uid,job),this.debounce);}
  }
}
