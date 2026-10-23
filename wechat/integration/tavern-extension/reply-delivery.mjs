export function deliveryPlan(value,userMessages=[]){
 if(!value||!['react','play','comfort','company','explore','task'].includes(value.mode)||!Number.isFinite(value.target_chars??value.max_chars))return null;
 return {mode:value.mode,target_chars:Math.max(20,Math.min(1400,Math.round(value.target_chars??value.max_chars))),
  followup:value.followup===true,bubble_count:[1,2,3].includes(value.bubble_count)?value.bubble_count:1,
  grounding_quotes:Array.isArray(value.grounding_quotes)?value.grounding_quotes.filter(q=>typeof q==='string'&&q.length>=4&&q.length<=200&&userMessages.some(text=>text.includes(q))).slice(0,6):[]};
}
export function packageReply(text,plan){
 const source=String(text||'').trim();
 const pieces=source.includes('```')?[source]:source.split(/\s*<\/?WECHAT_BUBBLE>\s*/i).map(x=>x.trim()).filter(Boolean);
 const bubbles=plan?.bubble_count>1&&pieces.length>1&&pieces.length<=3?pieces:[pieces.join(' ')];
 return {text:bubbles.join('\n'),bubbles:bubbles.filter(Boolean)};
}

export function mediaClaimIssues(text,evidence=[]){
 if(!evidence.length||evidence.every(item=>item.watched_entire_video===true))return [];
 const pattern=/(?<!没)(?<!你)(?:(?:看完|刷完|播完)(?!这(?:几|些)帧|第一帧|第[0-9]+帧|采样|片段|字幕)|完整看过|看了全片|从头到尾看(?:了|过)|(?:看|刷)(?:了|到)一半)/g;
 const negated=/(?:(?:没(?:有)?|未|不能(?:说|算)?|不敢说|不算|并非)(?:真的?|已经|完全|完整|连续|确实|认真|从头到尾|说|算|能|敢|有|都|还|算是| ){0,3}|(?:如果|假如|要是).{0,6})$/;
 return [...String(text).matchAll(pattern)].filter(m=>!negated.test(text.slice(Math.max(0,m.index-12),m.index))).map(m=>m[0]);
}

export function mediaNarrationIssues(text,evidence,userText=''){
 if(!evidence.length||/抽帧|采样|音轨|转写|字幕|证据|几帧|看完|看过|读到|读了|只看|看清|怎么(?:读取|识别|看到|知道)|看了多少|哪一段/.test(userText))return [];
 return /我(?:这边)?(?:只)?(?:抽|拿到|读到).{0,24}(?:帧|转写|音轨)|(?:抽样|采样)(?:了)?(?:几|六|6).{0,4}帧/.test(text)?['unrequested_media_read_process']:[];
}

export function repeatedImageCallbacks(history,userText='',context=''){
 if(!/^\[(?:图片|image)\]$/i.test(userText.trim()))return [];
 const stop=new Set(['这个','那个','这样','那样','怎么','什么','还是','就是','不是','但是','不过','已经','现在','刚才','一点','一下','一个','一张','这张','那张','感觉','看着','看见','看到','时候','自己','真的','可以','没有','觉得','不会','你们','我们','他们','好像','小鲸鱼','鲸鱼','表情','图片','的话']);
 const segmenter=new Intl.Segmenter('zh',{granularity:'word'}),counts=new Map();
 for(const row of history.filter(x=>!x.is_user&&!x.is_system&&!x.extra?.tool_invocations).slice(-14)){
  const words=new Set([...segmenter.segment(String(row.mes||''))].filter(x=>x.isWordLike&&/^[\p{Script=Han}]{2,8}$/u.test(x.segment)&&!stop.has(x.segment)).map(x=>x.segment));
  for(const word of words)counts.set(word,(counts.get(word)||0)+1);
 }
 const current=userText+' '+context;
 return [...counts].filter(([word,count])=>count>=3&&!current.includes(word)).sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length).slice(0,6).map(([word,count])=>({word,previous_assistant_turns:count}));
}

export async function reviewMediaReply(text,evidence,revise,userText='',history=[],context=''){
 if(String(text).trim()==='<SKIP>')return {text,audit:{attempted:false,issues:[],outcome:'silence_preserved'}};
 const callbacks=repeatedImageCallbacks(history,userText,context);
 const issues=[...mediaClaimIssues(text,evidence),...mediaNarrationIssues(text,evidence,userText),...(callbacks.length?['repeated_own_image_callback']:[])];
 if(!issues.length)return {text,audit:{attempted:false,issues:[]}};
 const audit={attempted:true,issues,callback_hints:callbacks,revision_tools:'none'};
 try{
  const fixed=await revise(issues,callbacks);
  if(typeof fixed==='string'&&fixed.trim()&&!mediaClaimIssues(fixed,evidence).length)return {text:fixed.trim(),audit:{...audit,outcome:'revised',remaining_narration:mediaNarrationIssues(fixed,evidence,userText)}};
 }catch{audit.revision_failed=true}
 if(!mediaClaimIssues(text,evidence).length)return {text,audit:{...audit,outcome:'review_unavailable_original_retained'}};
 // Same finite fallback as the DSH guard: preserve supported sentences, never
 // execute tools again or knowingly deliver an unsupported complete-watch claim.
 const units=String(text).match(/[^。！？?!\n]+[。！？?!\n]*/g)||[];
 const safe=units.filter(unit=>!mediaClaimIssues(unit,evidence).length).join('').trim();
 return {text:safe||'我只读到了视频的一部分，还不能说完整看过',audit:{...audit,outcome:'unsupported_claim_removed'}};
}
