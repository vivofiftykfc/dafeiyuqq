import assert from 'node:assert/strict';import {chromium} from '../../tools/console-tests/node_modules/playwright-core/index.mjs';import {zhihuPageOperation} from '../src/zhihu-browser.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext();await context.route('**/*',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<title>测试知乎</title><header class="AppHeader-userInfo"><a href="https://www.zhihu.com/people/owner">测试账号</a></header><h1>机器人问题</h1><div class="QuestionAnswer-content"><div class="AnswerItem"><span class="AuthorInfo-name">作者</span><div class="RichContent-inner"><div class="RichText">${'这是测试正文，说明机器人控制的原理。'.repeat(10)}</div></div><textarea></textarea><button id="submit">发布</button><div id="comments"></div></div></div><script>window.posts=0;submit.onclick=()=>{window.posts++;const d=document.createElement('div');d.className='CommentItem';d.dataset.id='mock-comment';d.innerHTML='<a href="/people/owner">owner</a><div class="CommentItem-content"></div>';d.querySelector('.CommentItem-content').textContent=document.querySelector('textarea').value;comments.append(d);}</script>`}));
 const page=await context.newPage(),url='https://www.zhihu.com/question/11/answer/22';await page.goto(url);
 assert.equal((await zhihuPageOperation(page,{op:'account'})).uid,'owner');
 const args={url,type:'answer',uid:'owner'};const read=await zhihuPageOperation(page,{op:'read',...args});assert(read.text.length>40);assert.equal(read.partial,false);
 await zhihuPageOperation(page,{op:'prepare',...args,text:'测试评论'});assert.equal(await page.evaluate(()=>window.posts),0);
 await page.locator('textarea').fill('被修改');await assert.rejects(zhihuPageOperation(page,{op:'commit',...args,text:'测试评论'}),/变化/);
 await zhihuPageOperation(page,{op:'prepare',...args,text:'测试评论'});const r=await zhihuPageOperation(page,{op:'commit',...args,text:'测试评论'});assert(r.confirmed);assert.equal(r.id,'mock-comment');assert.equal(await page.evaluate(()=>window.posts),1);
 await assert.rejects(zhihuPageOperation(page,{op:'prepare',...args,uid:'other',text:'bad'}),/账号/);
 await page.evaluate(()=>document.title='安全验证');await assert.rejects(zhihuPageOperation(page,{op:'read',...args}),/验证/);
 console.log('PASS browser DOM fixture: logged-in account, content evidence, prepare without sending, changed-text refusal, author-matched receipt, wrong account and captcha stop; all network intercepted');
}finally{await browser.close();}
