import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {chromium} from '../../tools/console-tests/node_modules/playwright-core/index.mjs';
import {bridgeHarness} from './audit-bridge-harness.mjs';
const h=await bridgeHarness({files:{'roles/测试.md':'一、角色身份\n蓝色鲸鱼。','state/owner/identity.md':'测试主人原人格'}});let server,browser;
try{h.setMode('closed-agent');h.setPresets(['standard','qq-chat','qq-chat-v2','dafeiyu-owner']);fs.mkdirSync(path.join(h.temp,'public'));fs.copyFileSync(new URL('../public/session-policies.html',import.meta.url),path.join(h.temp,'public/session-policies.html'));
server=h.startConsoleServer();if(!server.listening)await new Promise(r=>server.once('listening',r));const origin=`http://127.0.0.1:${server.address().port}`;
browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});const page=await browser.newPage({viewport:{width:1400,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
await page.goto(origin+'/session-policies?token=fixture-console-token');await page.locator('#rows tr').first().waitFor();await page.locator('#key').fill('group:456');await page.locator('#mode').selectOption('reserved2');await page.locator('#role').selectOption('测试');await page.locator('#proactive').selectOption('off');await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('已应用'));
assert.equal(h.modeFor('group:456'),'reserved2');await page.locator('#preview').click();await page.waitForFunction(()=>document.querySelector('#previewText').textContent.includes('蓝色鲸鱼'));assert.deepEqual(errors,[]);
await page.screenshot({path:path.resolve(import.meta.dirname,'../../logs/session-policy-console.png'),fullPage:true});console.log('PASS actual browser: load, select, save, preview, no script errors; no QQ send');
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await h.close();}
