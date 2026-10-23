const {chromium}=require('../runtime/tavern-test/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage();
 await page.route('**/scripts/extensions/third-party/dafeiyu/index.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('setInterval(tick,1200);','/* test: no inbound queue consumer */')})});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:18020',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.DafeiyuTavern&&SillyTavern.getContext().characters.length);
 await page.evaluate(async()=>{const c=SillyTavern.getContext();await c.selectCharacterById(c.characters.findIndex(x=>x.name==='小鲸鱼私聊测试'))});
 await page.locator('#api_button_openai').dispatchEvent('click');
 await page.waitForFunction(()=>SillyTavern.getContext().onlineStatus!=='no_connection');
 const result=await page.evaluate(async()=>{
  const {sendMessageAsUser}=await import('/script.js');const c=SillyTavern.getContext();
  const supported=c.isToolCallingSupported();
  await sendMessageAsUser('帮我搜一下酒馆官方摘要功能的文档，再读那个网页，简单告诉我自动摘要怎么开，附上来源。');
  const before=c.chat.length;await c.generate('normal');await c.saveChat();
  return {supported,messages:c.chat.slice(before)};
 });
 fs.writeFileSync('runtime/tavern-web-probe.json',JSON.stringify({errors,...result},null,2));
 console.log(JSON.stringify({errors,supported:result.supported,messages:result.messages.map(x=>({mes:x.is_system?'[tool result]':x.mes,toolCalls:x.extra?.tool_invocations?.map(t=>t.name)}))}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
