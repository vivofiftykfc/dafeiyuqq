import assert from 'node:assert/strict';import {chromium} from '../../tools/console-tests/node_modules/playwright-core/index.mjs';import {BilibiliBrowser} from '../src/bilibili-browser.js';
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext();
const adapter=new BilibiliBrowser('unused-test-profile');adapter.context=context;adapter.page=await context.newPage();
const url='https://www.bilibili.com/video/BV1xx411c7mD/';
const html=`<title>测试视频</title><a class="header-avatar-wrap" href="https://space.bilibili.com/123">test</a><h1>测试片段</h1><div id="v_desc">简介</div><bwp-video style="display:block;width:640px;height:360px;background:#abc">可见画面</bwp-video><div class="bpx-player-subtitle-panel-text">测试字幕</div><div id="comment"><bili-comment-box></bili-comment-box></div><script>
const v=document.querySelector('bwp-video');Object.assign(v,{currentTime:0,duration:100,paused:true,ended:false,playbackRate:1,play(){this.paused=false},pause(){this.paused=true}});setInterval(()=>{if(!v.paused)v.currentTime+=1},1000);
const box=document.querySelector('bili-comment-box').attachShadow({mode:'open'});box.innerHTML='<textarea></textarea><button>发布</button>';window.posts=0;box.querySelector('button').onclick=()=>{window.posts++;const item=document.createElement('bili-comment-thread-renderer');item.innerHTML='<a href="https://space.bilibili.com/123">test</a><div id="content"></div>';item.querySelector('#content').textContent=box.querySelector('textarea').value;document.querySelector('#comment').append(item);};</script>`;
await context.route('**/*',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:html}));
try{
 await adapter.page.goto(url);assert.equal((await adapter.account()).uid,'123');const result=await adapter.watch(url,{seconds:10});assert(result.watchedSeconds>=8);assert(result.frames.length>0);assert(result.samples.some(s=>s.subtitle.includes('测试字幕')));
 let claims=0;const posted=await adapter.publish(url,'测试评论','123',()=>claims++);assert(posted.confirmed);assert.equal(claims,1);assert.equal(await adapter.page.evaluate(()=>window.posts),1);
 await adapter.page.evaluate(()=>{const d=document.createElement('div');d.className='geetest_panel';d.textContent='验证';document.body.append(d);});await assert.rejects(adapter.guard(),/验证/);
 console.log('PASS browser fixture: player progress, screenshot/subtitles, shadow DOM comment, pre-click claim, DOM confirmation, captcha stop; no network requests');
}finally{await browser.close();}
