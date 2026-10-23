/* A reversible generation-only view. Never edits or summarizes the source chat. */
const legacyHeader='[桥接补充：';
const marker='[当前消息]\n';
const control=/^\/(?:角色|龙虾|openclaw)(?:\s|$)/i;
const staleOperation=/桥接|后台|配置|通道|回执|没有.{0,12}(?:工具|开关)|图库.{0,12}空|(?:等|等着).{0,12}脚本|Seraphina.{0,8}(?:是谁|谁啊)/;

const bareImage=/^\[(?:图片|image)\]$/i;
export function stampUserTurn(row,job){
 if(!row?.is_user||row.mes!==job.text)throw Error('Current user turn does not match active job');
 row.extra={...(row.extra||{}),dafeiyu_source:job.id};
 if(job.senderIdentity)row.extra.dafeiyu_speaker_identity=structuredClone(job.senderIdentity);
 if(job.visualEvent){
  if(bareImage.test(String(job.text||'').trim()))row.extra.dafeiyu_visual_event=job.visualEvent;
  else row.extra.dafeiyu_visual_reference=job.visualEvent;
 }
}

export function conversationView(messages,options={}){
 const output=[];const stats={unwrapped:0,controls:0,staleOperations:0};
 let legacyTurn=false,controlTurn=false;
 for(const source of messages){
  const row=structuredClone(source);
  if(row.is_user){
   legacyTurn=String(row.mes||'').startsWith(legacyHeader);controlTurn=false;
   if(legacyTurn){
    const index=row.mes.lastIndexOf(marker);
    if(index<0){controlTurn=true;stats.controls++;continue;}
    row.mes=row.mes.slice(index+marker.length);stats.unwrapped++;
    // This was an image-analysis event, not a literal paragraph typed by the user.
    if(row.mes.startsWith('[当前收到的图片观察结果')){
     row.mes='[用户当时发送的图片；识别资料并非用户原话]\n'+row.mes.replace(/^\[[^\]]*\]\s*/,'').slice(0,1400);
    }
   }
   if(control.test(row.mes.trim())){controlTurn=true;stats.controls++;continue;}
  }else if(controlTurn){stats.controls++;continue;}
  else if(legacyTurn&&staleOperation.test(String(row.mes||''))){stats.staleOperations++;continue;}
  output.push(row);
 }
 // A new bare picture is not automatically the next frame of the old picture.
 // Retire only the assistant's old image remarks, not user text or observations.
 // Exact same-image followups and comparisons retain their original exchange.
 const freshVisual=options.visualEvent&&bareImage.test(String(options.text||'').trim());
 let oldImageTurn=false;stats.retiredImageReplies=0;
 const focused=output.filter((row,index)=>{
  if(row.is_user){
   oldImageTurn=bareImage.test(String(row.mes||'').trim())&&row.extra?.dafeiyu_visual_event!==options.visualEvent;
   return true;
  }
  if(!freshVisual||!oldImageTurn||row.is_system||row.extra?.tool_invocations)return true;
  // If the last reply actually invited an image, keep its conversational role.
  const lastReply=!output.slice(index+1).some(next=>!next.is_user&&!next.is_system);
  if(lastReply&&/(?:发|贴).{0,8}(?:图|照片|截图)|(?:图|照片|截图).{0,8}(?:发来|给我|发我)|给我看看/.test(String(row.mes||'')))return true;
  stats.retiredImageReplies++;return false;
 });
 for(const row of focused){
  if(row.is_user&&bareImage.test(String(row.mes||'').trim())&&row.extra?.dafeiyu_visual_event){
   row.mes='[图片ID='+row.extra.dafeiyu_visual_event+'；这是当时分享的图片，不是当前图片的默认指代]';
  }
  if(options.scope==='group'&&row.is_user&&row.name){
   const identity=row.extra?.dafeiyu_speaker_identity;
   const label=identity?JSON.stringify({display_name:row.name,stable_id:identity.stable_id,code:identity.code}):String(row.name).slice(0,120);
   row.mes='[本条群聊发言者：'+label+']\n'+row.mes;
  }
 }
 return {messages:focused,stats};
}
