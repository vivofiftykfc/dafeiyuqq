// Generation completion does not establish that a reply reached WeChat.
export const DELIVERY_WAIT_MS=60000;
export const BURST_WAIT_MS=650;
export const BURST_JOIN_MS=1500;
export function coalescible(job,continuation=false){
 if(job.scope!=='private'||job.kind!=='chat'||job.visualEvent||job.requireReceipt!==true)return false;
 if(!(job.id.startsWith('wechat:')&&!job.evaluation||job.evaluation&&job.coalesceEvaluation===true))return false;
 const text=job.text||'';
 // Keep commands, persistence and possible tool requests on their existing path.
 return text.length>0&&text.length<=160&&(continuation||job.burstContinuation===true||/^(?:我|今天|昨天|最近|刚才|刚刚|但是|不过|而且|然后|所以|就是|主要|嗯|啊|哈|唉|你知道吗|跟你说|跟你讲)/.test(text))&&!/^[\/／]|https?:|提醒|叫醒|叫我|喊我|敲我|闹钟|分钟|小时|定时|日程|调度|画|绘|生成|图|收藏|保存|存下|收进|发|表情|贴纸|查|搜|浏览|打开|关闭|运行|执行|删除|修改|改成|改一下|设置|配置|重启|切换|暂停|恢复|记住|忘掉|记一下|记下来|以后|今后|下次|一直|能不能|能否|可不可以|帮我|给我|请你|创建|新建|写|文件|文档|脚本|安装|下载|陪伴模式|朗读|语音|tts|朋友圈|我(?:更|不|很|最|比较|其实)?喜欢|我叫|我的生日|我习惯|[A-Za-z]:\\/i.test(text);
}
export function sameConversation(a,b){
 return a.scope===b.scope&&a.avatar===b.avatar&&a.chatFile===b.chatFile;
}
export function nextJob(jobs,now=Date.now(),{tavernReady=true}={}){
 const values=Object.values(jobs),pending=values.filter(j=>j.state==='pending');
 const observations=pending.filter(j=>j.kind==='observation');
 if(observations.length)return {job:observations[0],expired:[]};
 const waiting=values.filter(j=>j.state==='done'&&j.requireReceipt===true&&!j.contextOnly&&!j.delivery&&Number.isFinite(j.completed));
 const expired=waiting.filter(j=>now-j.completed>=DELIVERY_WAIT_MS&&!j.deliveryWaitExpired).map(j=>j.id);
 const eligible=pending.filter((j,index)=>!(j.kind?.startsWith('runtime:')&&pending.some(other=>other.kind==='chat'&&sameConversation(other,j)))&&!pending.slice(0,index).some(prior=>sameConversation(prior,j)&&(prior.kind==='chat'||j.kind!=='chat'))&&!waiting.some(prior=>sameConversation(prior,j)&&prior.created<=j.created&&now-prior.completed<DELIVERY_WAIT_MS));
 const available=eligible.filter(j=>tavernReady||j.engine==='dsh');
 const ordered=[...available.filter(j=>j.id.startsWith('wechat:')),...available.filter(j=>!j.id.startsWith('wechat:'))];
 for(const candidate of ordered){
  if(coalescible(candidate)){
   const following=pending.slice(pending.indexOf(candidate)+1).find(j=>sameConversation(j,candidate));
   if(following&&coalescible(following,true)&&following.created-candidate.created<=BURST_JOIN_MS)return {job:candidate,contextOnly:true,supersededBy:following.id,expired};
   if(now-candidate.created<BURST_WAIT_MS)continue;
  }
  return {job:candidate,expired};
 }
 return {job:null,expired};
}
