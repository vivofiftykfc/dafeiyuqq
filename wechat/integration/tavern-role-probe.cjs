const {chromium}=require('../runtime/tavern-test/node_modules/playwright');const fs=require('fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.route('**/scripts/extensions/third-party/dafeiyu/index.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('setInterval(tick,1200);','/* no queue consumption during test */')})});
 await page.goto('http://127.0.0.1:18020');await page.waitForFunction(()=>window.DafeiyuTavern&&SillyTavern.getContext().characters.length);
 const result=await page.evaluate(async()=>{
  const c=SillyTavern.getContext();const {sendMessageAsUser}=await import('/script.js');
  const a=c.characters.findIndex(x=>x.name==='小鲸鱼私聊测试'),b=c.characters.findIndex(x=>x.name==='小鲸鱼群聊测试');
  const oldA=c.characters[a].chat,oldB=c.characters[b].chat;const marker='role-isolation-'+Date.now();
  await c.selectCharacterById(a);await c.openCharacterChat('acceptance-private');await sendMessageAsUser(marker);await c.saveChat();
  await c.selectCharacterById(b);await c.openCharacterChat('acceptance-private');const differentCard=!c.chat.some(x=>x.mes.includes(marker));
  await c.selectCharacterById(a);await c.openCharacterChat('acceptance-group');const differentScope=!c.chat.some(x=>x.mes.includes(marker));
  await c.openCharacterChat('acceptance-private');const restored=c.chat.some(x=>x.mes.includes(marker));
  await c.openCharacterChat(oldA);await c.selectCharacterById(b);await c.openCharacterChat(oldB);
  return {differentCard,differentScope,restored};
 });fs.writeFileSync('runtime/tavern-role-acceptance.json',JSON.stringify(result));console.log(JSON.stringify(result));if(!Object.values(result).every(Boolean))throw new Error('Role isolation failed');
}finally{await browser.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
