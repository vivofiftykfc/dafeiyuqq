import fs from 'node:fs';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

export function videoUrl(value){
 const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='www.bilibili.com'||u.port||u.username||u.password)throw Error('仅支持 https://www.bilibili.com/video/BV… 视频地址');
 const m=u.pathname.match(/^\/video\/(BV[0-9A-Za-z]{10})\/?$/);if(!m)throw Error('需要完整的 BV 视频链接');
 const p=u.searchParams.get('p')||'1';if(!/^\d{1,3}$/.test(p)||Number(p)<1)throw Error('分P无效');
 return {key:m[1]+':'+p,bvid:m[1],url:`https://www.bilibili.com/video/${m[1]}/`+(p==='1'?'':'?p='+p)};
}

// Only normal page navigation, DOM and visible player controls; no private API or cookie export.
export class BilibiliBrowser {
 constructor(root){this.root=root;this.context=null;this.page=null;}
 async open(){
  if(this.context&&this.page&&!this.page.isClosed()){await this.page.bringToFront();return;}
  const {chromium}=await import('../../tools/console-tests/node_modules/playwright-core/index.mjs');
  fs.mkdirSync(this.root,{recursive:true});
  this.context=await chromium.launchPersistentContext(path.join(this.root,'chrome-profile'),{channel:'chrome',headless:false,viewport:{width:1280,height:850},acceptDownloads:false});
  this.context.setDefaultTimeout(8000);this.context.on('close',()=>{this.context=null;this.page=null;});
  this.page=this.context.pages()[0]||await this.context.newPage();
  this.page.on('download',d=>void d.cancel());
  await this.page.goto('https://www.bilibili.com/',{waitUntil:'domcontentloaded',timeout:30000});
 }
 async guard(){
  if(!this.page||this.page.isClosed())throw Error('请先打开 B 站专用浏览器并登录');
  const u=new URL(this.page.url());if(u.protocol!=='https:'||u.hostname!=='www.bilibili.com')throw Error('专用页面已离开 B 站，请重新打开');
  const challenge=this.page.locator('.geetest_panel:visible, .geetest_panel_box:visible, .bili-captcha:visible, iframe[src*="captcha"]:visible');
  if(await challenge.count())throw Error('需要人工完成验证，已停止自动操作');
  const title=await this.page.title();if(/访问受限|安全验证|访问出错|412|验证码/.test(title))throw Error('B 站要求验证或限制访问，已停止自动操作');
 }
 async account(){
  if(!this.page||this.page.isClosed())return null;
  await this.guard();
  const links=this.page.locator('.header-avatar-wrap a[href*="space.bilibili.com"], a.header-entry-mini[href*="space.bilibili.com"], .header-avatar-wrap[href*="space.bilibili.com"]');
  await links.first().waitFor({state:'visible',timeout:10000}).catch(()=>{});
  for(const a of await links.all()){if(!await a.isVisible())continue;const href=await a.getAttribute('href');const m=href?.match(/space\.bilibili\.com\/(\d+)/);if(m)return {uid:m[1],name:(await a.getAttribute('title'))||(await a.innerText()).trim()||'B站用户 '+m[1]};}
  return null;
 }
 async inspect(){await this.guard();return {url:this.page.url(),title:await this.page.title(),profileLinks:await this.page.locator('a[href*="space.bilibili.com"]').evaluateAll(xs=>xs.slice(0,20).map(x=>({href:x.getAttribute('href'),className:x.className,parent:x.parentElement?.className}))),editors:await this.page.locator('textarea:visible, [contenteditable="true"]:visible').evaluateAll(xs=>xs.map(x=>({tag:x.tagName,id:x.id,className:x.className,placeholder:x.getAttribute('placeholder')}))),commentBoxes:await this.page.locator('bili-comment-box').count(),buttons:await this.page.locator('bili-comment-box').locator('*').evaluateAll(xs=>xs.filter(x=>/^(发布|发送|评论)$/.test(x.textContent.trim())).slice(0,15).map(x=>({tag:x.tagName,id:x.id,className:x.className,text:x.textContent.trim()})))};}
 async recommendations(){
  await this.guard();const p=this.page;
  await p.goto('https://www.bilibili.com/',{waitUntil:'domcontentloaded',timeout:30000});await this.guard();
  await p.locator('a[href*="/video/BV"]').first().waitFor({timeout:12000});
  const entries=await p.locator('a[href*="/video/BV"]').evaluateAll(xs=>xs.slice(0,80).map(x=>({url:x.href,title:x.getAttribute('title')||x.closest('.bili-video-card')?.querySelector('h3')?.textContent||x.querySelector('h3')?.textContent||''})));
  const seen=new Set();return entries.flatMap(e=>{try{const v=videoUrl(e.url);if(seen.has(v.key)||!e.title.trim())return [];seen.add(v.key);return [{...v,title:e.title.trim().slice(0,200)}];}catch{return [];}}).slice(0,12);
 }
 async watch(url,{seconds=60,resume=0,signal}={}){
  const target=videoUrl(url);await this.guard();const p=this.page;
  await p.goto(target.url,{waitUntil:'domcontentloaded',timeout:30000});await this.guard();
  const player=p.locator('video, bwp-video').first();await player.waitFor({state:'visible',timeout:15000});
  const title=await p.locator('h1').first().innerText();
  const description=await p.locator('#v_desc, .video-desc-container').first().innerText().catch(()=>'');
  await player.evaluate((v,t)=>{v.muted=true;if(Number.isFinite(v.duration)&&t>0&&t<v.duration-3)v.currentTime=t;},resume);
  await player.evaluate(v=>v.play()).catch(()=>{});
  const frames=[],samples=[];let lastTime=null,watched=0;
  try{
   for(let elapsed=0;elapsed<=seconds;elapsed+=5){
    signal?.throwIfAborted();await this.guard();if(videoUrl(p.url()).key!==target.key)throw Error('页面被切换，停止本次观看');
    const state=await player.evaluate(v=>({time:Number(v.currentTime)||0,duration:Number(v.duration)||0,paused:v.paused,ended:v.ended,rate:Number(v.playbackRate)||1}));
    if(lastTime!==null&&!state.paused){const delta=state.time-lastTime;if(delta>0&&delta<=7)watched+=delta;}lastTime=state.time;
    const subtitle=await p.locator('.bpx-player-subtitle-panel-text, .bpx-player-subtitle-item-text, .bilibili-player-video-subtitle-item-text').allTextContents();
    samples.push({...state,subtitle:subtitle.join(' ').slice(0,1500)});
    if(frames.length<4&&(elapsed%20===0||state.ended)){const bytes=await player.screenshot({type:'jpeg',quality:60,timeout:5000});frames.push({time:state.time,type:'image',mediaType:'image/jpeg',data:bytes.toString('base64')});}
    if(state.ended)break;if(elapsed<seconds)await delay(5000,undefined,{signal});
   }
  }finally{await player.evaluate(v=>v.pause()).catch(()=>{});}
  if(watched<8)throw Error('播放器未实际播放足够内容；请处理登录、播放提示或验证');
  return {...target,title:title.slice(0,250),description:description.slice(0,1500),watchedSeconds:Math.round(watched),start:samples[0]?.time||0,end:samples.at(-1)?.time||0,duration:samples.at(-1)?.duration||0,samples,frames,limitations:'仅根据已播放片段、采样画面和当时可见字幕理解；未采集音频，不能声称看完整段或听清声音。'};
 }
 async commentEditor(url,text,uid){
  await this.guard();const target=videoUrl(url),p=this.page;
  let current;try{current=videoUrl(p.url()).key;}catch{}
  if(current!==target.key)await p.goto(target.url,{waitUntil:'domcontentloaded',timeout:30000});
  await this.guard();if((await this.account())?.uid!==uid)throw Error('账号发生变化或已退出登录');
  await p.locator('video, bwp-video').first().evaluate(v=>v.pause()).catch(()=>{});
  await p.locator('#comment, bili-comments, .comment-container').first().scrollIntoViewIfNeeded();
  // Playwright pierces open shadow roots used by the current comment component.
  const visibleEditor=p.locator('textarea:visible, [contenteditable="true"]:visible');
  let box=p.locator('bili-comment-box').filter({has:visibleEditor});
  let editor=box.locator('textarea:visible, [contenteditable="true"]:visible');
  await editor.first().waitFor({state:'visible',timeout:10000}).catch(()=>{});
  if(await editor.count()!==1)editor=p.locator('#comment .reply-box-textarea:visible, #comment textarea.reply-box-textarea:visible');
  if(await editor.count()!==1)throw Error('无法唯一定位视频评论框，草稿已保留');
  await editor.fill(text);const submit=await this.submitButton(box,p);return {p,box,editor,target,submit};
 }
 async submitButton(box,p){
  let submit=p.locator('bili-comment-box').getByRole('button',{name:'发布',exact:true}).filter({visible:true});
  await submit.first().waitFor({state:'visible',timeout:5000}).catch(()=>{});
  if(await submit.count()!==1)submit=box.locator('#pub:visible, .reply-box-send:visible');
  if(await submit.count()!==1)submit=box.getByText(/^(发布|发送)$/).filter({visible:true});
  if(await submit.count()!==1)submit=p.locator('#comment .reply-box-send:visible');
  if(await submit.count()!==1||!await submit.isEnabled())throw Error('未找到唯一可用的评论发布按钮（匹配数量 '+await submit.count()+'）');
  return submit;
 }
 async publish(url,text,uid,beforeClick){
  const {p,target,submit}=await this.commentEditor(url,text,uid);
  await this.guard();if(videoUrl(p.url()).key!==target.key||(await this.account())?.uid!==uid)throw Error('发布前页面或账号变化');
  beforeClick();await submit.click({timeout:8000});
  // Do not infer success from a click or from the draft still being in the textarea.
  for(let i=0;i<5;i++){
   await delay(1000);await this.guard();
   const items=p.locator('bili-comment-thread-renderer, #comment .reply-item');
   for(const item of await items.all()){
    const author=await item.locator(`a[href*="space.bilibili.com/${uid}"]`).count();
    const content=await item.locator('#content, .reply-content').allTextContents();
    if(author&&content.some(c=>c.trim()===text.trim()))return {confirmed:true};
   }
  }
  return {confirmed:false};
 }
 async close(){await this.context?.close();}
}
