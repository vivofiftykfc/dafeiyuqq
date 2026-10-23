import assert from 'node:assert/strict';import {chromium} from '../../tools/console-tests/node_modules/playwright-core/index.mjs';import {startConsoleFixture} from './console-ui-fixture.mjs';
const fixture=await startConsoleFixture(),browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
 const state={ok:true,settings:{enabled:true,autonomous:true,mode:'draft',maxVideos:3,maxComments:2,watchSeconds:60,uid:'123',name:'测试账号',blocked:''},browserOpen:true,busy:false,drafts:[{id:'draft',video:'BV1xx411c7mD',text:'<script>window.attacked=true</script>',state:'draft'}],videos:[{title:'测试视频',url:'https://www.bilibili.com/video/BV1xx411c7mD/',state:'viewed',data:{impression:'只看到了前60秒',watchedSeconds:60,end:60}}],events:[]};
 await page.route('**/api/bilibili',async r=>{if(r.request().method()==='POST')writes.push(r.request().postDataJSON());await r.fulfill({json:state});});
 await page.addInitScript(()=>localStorage.setItem('consoleToken','test-token'));await page.goto(fixture.url+'/#bilibili');await page.waitForFunction(()=>document.getElementById('biliState')?.textContent.includes('已绑定'));
 await page.click('#biliOpen');await page.click('#biliVerify');await page.selectOption('#biliMode','read');await page.click('#biliSave');await page.getByRole('button',{name:'发布这条评论',exact:true}).click();
 assert(writes.some(x=>x.action==='open'));assert(writes.some(x=>x.action==='verify'));assert(writes.some(x=>x.settings?.mode==='read'));assert(writes.some(x=>x.action==='publish'&&x.id==='draft'));assert.equal(await page.evaluate(()=>window.attacked),undefined);
 await page.screenshot({path:'../logs/bilibili-ui.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 console.log('PASS Bilibili UI: login, settings, draft publish dispatch, XSS escaping, mobile; fixture only');
}finally{await browser.close();await fixture.close();}
