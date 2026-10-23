import assert from 'node:assert/strict';import path from 'node:path';
import {chromium} from '../../tools/console-tests/node_modules/playwright-core/index.mjs';
import {startConsoleFixture} from './console-ui-fixture.mjs';
const fixture=await startConsoleFixture(),browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const chat={k:'test',platform:'wechat',account:'bot',peer:'owner',summary:'summary',messages:2,archives:0};
 await page.route('**/api/manage/**',async r=>{assert.equal(r.request().headers()['x-console-token'],'test-token');const u=new URL(r.request().url()),body=r.request().postDataJSON();if(body)writes.push(u.pathname);let value={ok:true};
 if(u.pathname.endsWith('/status'))value={ok:true,wechat:{state:'running',account:'bot',processAlive:true,updated:1792755449},services:[{name:'微信后台',port:18020,up:true}],jobs:[]};
 else if(u.pathname.endsWith('/owner-memory'))value={ok:true,revision:'rev',facts:[{fact:'test owner',evidence:'test'}]};
 else if(u.pathname.endsWith('/detail'))value={ok:true,...chat,social:[{sender:'<script>friend</script>',affinity:45,mood:'平静',intensity:0.2,impression:'喜欢直说 <script>window.attacked=true</script>',strategy:'先说结论',updatedAt:Date.now(),pendingMessages:3,lastChange:{before:50,rawDelta:-1,multiplier:5,delta:-5,reason:'测试评分理由'}}],messages:[{id:1,role:'in',sender:'<script>friend</script>',text:'<script>window.attacked=true</script>',at:Date.now()}],archives:[]};
 else if(u.pathname.endsWith('/compact'))value={ok:true,job:{id:'job'}};
 else if(u.pathname.endsWith('/memory'))value={ok:true,chats:[chat]};
 await r.fulfill({json:value});});
 await page.addInitScript(()=>localStorage.setItem('consoleToken','test-token'));await page.goto(fixture.url+'/#memory-manage');await page.waitForFunction(()=>document.getElementById('memSummary').value==='summary');
 assert.match(await page.locator('#memSocial').innerText(),/好感度 45 \/ 100/);assert.match(await page.locator('#memSocial').innerText(),/测试评分理由/);assert.match(await page.locator('#memSocial').innerText(),/先说结论/);
 await page.fill('#memSummary','edited');await page.click('#memSave');await page.waitForFunction(()=>document.getElementById('memInfo').textContent.includes('保存'));await page.click('#memCompact');
 assert.equal(await page.evaluate(()=>window.attacked),undefined);await page.click('#ownerMemNew');await page.fill('#ownerMemFact','a new fact');await page.click('#ownerMemSave');
 await page.screenshot({path:path.resolve('../logs/management-memory.png'),fullPage:true});
 await page.click('[data-group="channels"]');await page.click('#sectionNav [data-view="wechat-manage"]');await page.waitForFunction(()=>document.getElementById('wxStatus').textContent.includes('running'));await page.click('#wxStart');await page.click('#wxStop');
 await page.screenshot({path:path.resolve('../logs/management-wechat.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.click('[data-group="memory"]');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 for(const route of ['memory/summary','memory/compact','owner-memory','wechat'])assert(writes.some(w=>w.endsWith(route)),route);assert.deepEqual(errors,[]);
 console.log('PASS management UI navigation, edits, compression, owner memory, fixed WeChat controls, XSS and mobile');
}finally{await browser.close();await fixture.close();}
