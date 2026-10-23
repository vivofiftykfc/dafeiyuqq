import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '../../tools/console-tests/node_modules/playwright-core/index.mjs';
import {startConsoleFixture} from './console-ui-fixture.mjs';
const fixture=await startConsoleFixture();
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let enabled=false,connected=false;const writes=[],roster=[{uid:'222',name:'example_friend',reply:true}];
  await page.route('**/api/douyin-auto',async r=>{
    assert.equal(r.request().headers()['x-console-token'],'test-token');
    if(r.request().method()==='POST'){const body=r.request().postDataJSON();
      if(body.action==='contacts'){await r.fulfill({json:{ok:true,contacts:[{uid:'333',name:'<script>新好友</script>',added:false}]}});return;}
      if(body.action==='add')roster.push({uid:body.uid,name:'<script>新好友</script> [333]',reply:false});
      else if(body.action==='reply')roster.find(f=>f.uid===body.uid).reply=body.reply;
      else if(body.action==='remove')roster.splice(roster.findIndex(f=>f.uid===body.uid),1);
      if(body.action){if(['connect','disconnect'].includes(body.action))connected=body.action==='connect';writes.push(body.action);}else{enabled=body.enabled;writes.push(enabled);}}
    await r.fulfill({json:{ok:true,rosterVersion:1,roster,transport:'direct',connected,friends:roster.filter(f=>f.reply).map(f=>f.name),enabled,busy:false,phase:enabled?'正在建立基线':'已关闭',baselineCount:0,lastError:'',events:[{at:new Date().toISOString(),friend:'SAM',type:'incoming',text:'<script>window.attacked=true</script>'}]}});
  });
  await page.addInitScript(()=>localStorage.setItem('consoleToken','test-token'));
  await page.goto(fixture.url+'/#douyin-auto');
  await page.waitForFunction(()=>document.getElementById('douyinStatus').textContent.includes('已关闭'));
  await page.click('#douyinConnect');await page.waitForFunction(()=>document.getElementById('douyinConnect').disabled);
  assert.equal(await page.locator('#douyinFriends input:checked').count(),1);
  await page.click('#douyinStart');await page.waitForFunction(()=>document.getElementById('douyinStart').disabled);
  await page.click('#douyinStop');await page.waitForFunction(()=>!document.getElementById('douyinStart').disabled);
  await page.click('#douyinLoadContacts');await page.selectOption('#douyinContactPicker','333');await page.click('#douyinAddFriend');
  await page.waitForFunction(()=>document.querySelectorAll('#douyinFriends input').length===2);
  assert.equal(await page.locator('#douyinFriends input:checked').count(),1);
  await page.locator('#douyinFriends input').nth(1).check();await page.waitForFunction(()=>document.querySelectorAll('#douyinFriends input:checked').length===2);
  await page.locator('#douyinFriends button').nth(1).click();await page.waitForFunction(()=>document.querySelectorAll('#douyinFriends input').length===1);
  await page.click('#douyinDisconnect');await page.waitForFunction(()=>!document.getElementById('douyinConnect').disabled);
  assert.deepEqual(writes,['connect',true,false,'add','reply','remove','disconnect']);assert.equal(await page.evaluate(()=>window.attacked),undefined);
  assert.match(await page.locator('#douyinEvents').textContent(),/<script>/);
  const out=path.resolve(import.meta.dirname,'../../logs/douyin-auto-ui.png');await page.screenshot({path:out,fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);console.log('PASS UI enable/disable, authenticated request, escaped friend content, mobile; '+out);
}finally{await browser.close();await fixture.close();}
