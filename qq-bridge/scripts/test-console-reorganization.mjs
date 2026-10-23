import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '../../tools/console-tests/node_modules/playwright-core/index.mjs';
import {startConsoleFixture} from './console-ui-fixture.mjs';
const fixture=await startConsoleFixture(),out=new URL('../../logs/console-reorganization/',import.meta.url);
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',reducedMotion:'reduce'}),errors=[],writes=[],external=[];
 await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==fixture.url){external.push(r.request().url());return r.abort();}return r.continue();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('consoleToken','test-token'));
 let failed=false,stale=false,connected=true,enabled=false,conflict=false,delay=false;
 const chats=[{k:'a',platform:'wechat',account:'bot-a',peer:'<img onerror=window.attacked=true>',summary:'事实 A',messages:2,archives:0},{k:'b',platform:'wechat',account:'bot-b',peer:'peer-b',summary:'事实 B',messages:1,archives:0}];
 await page.route('**/api/douyin-auto',r=>r.fulfill({json:{ok:true,connected,enabled,baselineCount:1,phase:'模拟状态',roster:[],friends:[],events:[],transport:'direct'}}));
 await page.route('**/api/manage/**',async r=>{
  const u=new URL(r.request().url()),body=r.request().postDataJSON();if(body)writes.push({path:u.pathname,body});
  let value={ok:true};
  if(u.pathname.endsWith('/status'))value=failed?{ok:false,error:'模拟服务断开'}:{ok:true,wechat:{state:'running',processAlive:true,updated:Date.now()/1000-(stale?600:0)},services:[{port:18020,up:true}],jobs:[]};
  else if(u.pathname.endsWith('/owner-memory'))value={ok:true,revision:'rev',facts:[]};
  else if(u.pathname.endsWith('/memory'))value={ok:true,chats:u.searchParams.get('platform')==='qq'?[]:chats};
  else if(u.pathname.endsWith('/detail')){if(delay)await new Promise(resolve=>setTimeout(resolve,150));const c=chats.find(c=>c.account===body.account);value={ok:true,...c,messages:[{id:1,role:'in',sender:'fixture',text:'<script>window.attacked=true</script>',at:Date.now()}],archives:[],social:[]};}
  else if(u.pathname.endsWith('/summary'))value=conflict?{ok:false,error:'摘要版本冲突，请保留草稿'}:{ok:true};
  await r.fulfill({json:value});
 });
 await page.goto(fixture.url);
 await page.waitForFunction(()=>document.getElementById('health-douyin-reply').textContent==='已关闭');
 assert.equal(await page.locator('#mainNav button').count(),6);
 assert.equal(await page.locator('#channelOverview article').count(),3);
 assert.match(await page.locator('#health-wechat-reply').innerText(),/未提供/);
 for(const card of await page.locator('#channelOverview article').all()){const box=await card.boundingBox();assert(box.y+box.height<1000,'homepage cards above fold');}
 await page.screenshot({path:new URL('overview.png',out).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
 stale=true;enabled=true;connected=false;await page.click('#refreshConsole');
 await page.waitForFunction(()=>document.getElementById('health-wechat-connection').textContent.includes('历史快照'));
 assert.match(await page.locator('#health-douyin-reply').innerText(),/尚未就绪/);
 failed=true;await page.click('#refreshConsole');await page.waitForFunction(()=>document.getElementById('health-wechat-service').textContent==='检查失败');
 assert.equal(await page.locator('#health-wechat-connection').innerText(),'未知');
 assert.equal(writes.length,0,'home status only reads');
 await page.click('[data-group="memory"]');await page.waitForFunction(()=>document.getElementById('memSummary').value==='事实 A');
 await page.fill('#memSummary','未保存的 A');
 await page.click('[data-group="channels"]');await page.click('[data-group="memory"]');
 assert.equal(await page.inputValue('#memSummary'),'未保存的 A');
 await page.click('#memRefresh');await page.waitForFunction(()=>!document.getElementById('memListState').textContent.includes('正在加载'));
 assert.equal(await page.inputValue('#memSummary'),'未保存的 A');
 await page.selectOption('#memAccount','bot-b');await page.waitForFunction(()=>document.getElementById('memSummary').value==='事实 B');
 await page.selectOption('#memAccount','bot-a');await page.waitForFunction(()=>document.getElementById('memSummary').value==='未保存的 A');
 conflict=true;await page.click('#memSave');await page.waitForFunction(()=>document.getElementById('memError').textContent.includes('冲突'));
 assert.equal(await page.inputValue('#memSummary'),'未保存的 A');
 assert.equal(writes.find(w=>w.path.endsWith('/summary')).body.previous,'事实 A');
 // Out-of-order detail responses must not leak another conversation into the pane.
 delay=true;await page.selectOption('#memAccount','');await page.selectOption('#memChat','b');await page.selectOption('#memChat','a');
 await page.waitForFunction(()=>document.getElementById('memSummary').value==='未保存的 A');await page.waitForTimeout(200);
 assert.match(await page.locator('#memDetailTitle').innerText(),/bot-a/);
 assert.equal(await page.evaluate(()=>window.attacked),undefined);
 await page.screenshot({path:new URL('memory.png',out).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
 await page.fill('#memSearch','not-present');assert.equal(await page.locator('#memChat option').count(),0);assert(await page.isDisabled('#memSave'));
 await page.fill('#memSearch','');await page.selectOption('#memPlatform','qq');await page.waitForFunction(()=>document.getElementById('memChat').options.length===0);
 assert.match(await page.locator('#memListState').innerText(),/没有匹配/);
 for(const [hash,group] of [['wechat-manage','channels'],['douyin-auto','channels'],['sessions','memory'],['persona','behavior'],['social-v1','behavior'],['social-v2','behavior'],['slang','behavior'],['owner-activity','behavior'],['autonomy','behavior'],['reference','tools'],['usage','ops'],['access','ops'],['operations','ops']]){
  // Hash navigation preserves old bookmarks; reads use only the isolated fixture.
  await page.evaluate(hash=>{location.hash=hash;},hash);
  await page.waitForFunction(group=>document.querySelector('#mainNav [aria-current="page"]')?.dataset.group===group,group);
  assert(await page.locator(`[data-page="${hash}"]`).first().isVisible());
 }
 await page.setViewportSize({width:390,height:844});await page.click('[data-group="overview"]');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:new URL('mobile.png',out).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
 await page.click('[data-group="memory"]');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 assert(writes.every(w=>/\/memory\/(detail|summary)$/.test(w.path)),'no platform sends or configuration writes');
 console.log('PASS six entries, three-layer states, stale/failure handling, legacy hashes, drafts, account filters, empty states, conflicts, response races, XSS, responsive layout; isolated fixture only');
}finally{await browser.close();await fixture.close();}
