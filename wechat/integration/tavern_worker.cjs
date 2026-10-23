const {chromium}=require('../runtime/tavern-test/node_modules/playwright');
const fs=require('fs');
let running=true;process.on('SIGTERM',()=>running=false);
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();
 for(let attempt=0;;attempt++){
  try{await page.goto('http://127.0.0.1:18020',{waitUntil:'domcontentloaded'});break}
  catch(e){if(attempt>=29)throw e;await new Promise(r=>setTimeout(r,1000))}
 }
 await page.waitForFunction(()=>window.DafeiyuTavern&&window.SillyTavern?.getContext().characters?.length,{timeout:60000});
 await page.locator('#api_button_openai').dispatchEvent('click');
 await page.waitForFunction(()=>SillyTavern.getContext().onlineStatus!=='no_connection',{timeout:60000});
 console.log('SillyTavern worker connected');
 while(running){await new Promise(r=>setTimeout(r,5000));fs.writeFileSync('runtime/tavern-worker-state.json',JSON.stringify({ready:!page.isClosed(),time:Date.now()}))}
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
