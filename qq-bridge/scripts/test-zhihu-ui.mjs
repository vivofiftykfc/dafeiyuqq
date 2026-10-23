import assert from 'node:assert/strict';import {chromium} from '../../tools/console-tests/node_modules/playwright-core/index.mjs';import {startConsoleFixture} from './console-ui-fixture.mjs';
const fixture=await startConsoleFixture(),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/*',r=>new URL(r.request().url()).origin===fixture.url?r.continue():r.abort());
 const state={ok:true,connected:false,busy:false,settings:{enabled:true,autonomous:false,mode:'draft',maxReads:3,maxComments:2,interests:'机器人',uid:'owner',name:'测试账号'},readings:[{url:'https://www.zhihu.com/question/11/answer/22',state:'read',data:{title:'测试回答',summary:'事实',impression:'有趣',mood:'好奇',limitations:'只读正文'}}],drafts:[{id:'draft',target:'answer:22',text:'<script>window.attacked=true</script>',state:'draft'}],events:[]};
 await page.route('**/api/zhihu',async r=>{assert.equal(r.request().headers()['x-console-token'],'test-token');if(r.request().method()==='POST'){const b=r.request().postDataJSON();writes.push(b);if(b.action==='connect')state.connected=true;if(b.action==='settings')Object.assign(state.settings,b.settings);if(b.action==='publish')state.drafts[0].state='uncertain';}await r.fulfill({json:state});});
 await page.addInitScript(()=>localStorage.setItem('consoleToken','test-token'));await page.goto(fixture.url+'/#zhihu');await page.waitForFunction(()=>document.getElementById('zhState').textContent.includes('测试账号'));
 assert.equal(await page.locator('#mainNav [data-group]').count(),6);assert.equal(await page.locator('#mainNav [aria-current]').getAttribute('data-group'),'channels');
 await page.click('#zhConnect');await page.waitForFunction(()=>document.getElementById('zhState').textContent.includes('已连接'));await page.click('#zhVerify');await page.fill('#zhInterests','新的兴趣草稿');await page.waitForTimeout(5100);assert.equal(await page.inputValue('#zhInterests'),'新的兴趣草稿');
 await page.selectOption('#zhMode','read');await page.click('#zhSave');await page.waitForFunction(()=>document.querySelector('#zhDrafts button').disabled);
 await page.selectOption('#zhMode','draft');await page.click('#zhSave');await page.waitForFunction(()=>!document.querySelector('#zhDrafts button').disabled);
 await page.getByRole('button',{name:'发布这条知乎评论',exact:true}).click();await page.waitForFunction(()=>document.getElementById('zhDrafts').textContent.includes('uncertain'));
 assert(writes.some(w=>w.action==='publish'&&w.text===state.drafts[0].text));assert.equal(await page.evaluate(()=>window.attacked),undefined);
 await page.screenshot({path:'../logs/zhihu-connection/console.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 console.log('PASS Zhihu UI navigation, authenticated actions, read-mode publish block, draft preservation, expected-text publish, uncertain state, XSS, mobile; mock only');
}finally{await browser.close();await fixture.close();}
