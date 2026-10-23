const {chromium}=require('../runtime/tavern-test/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();
 page.on('pageerror',e=>console.log('pageerror',e.message.slice(0,200)));
 await page.goto('http://127.0.0.1:18020',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.SillyTavern?.getContext().characters?.some(c=>c.name==='小鲸鱼私聊测试'),{timeout:60000});
 const setup=await page.evaluate(async()=>{
  const c=SillyTavern.getContext();const id=c.characters.findIndex(x=>x.name==='小鲸鱼私聊测试');await c.selectCharacterById(id);
  return {main:c.mainApi,source:c.chatCompletionSettings.chat_completion_source,model:c.chatCompletionSettings.custom_model};
 });console.log('setup',JSON.stringify(setup));
 await page.locator('#api_button_openai').dispatchEvent('click');
 await page.waitForFunction(()=>SillyTavern.getContext().onlineStatus!=='no_connection',{timeout:60000});
 const results=[];
 for(const text of ['今天有点累，想黏你一会儿','不用劝我睡觉，陪我聊两句就好']){
  const answer=await page.evaluate(async(text)=>{
   const {sendMessageAsUser}=await import('/script.js');await sendMessageAsUser(text);
   const c=SillyTavern.getContext();const before=c.chat.length;await c.generate('normal');await c.saveChat();
   if(c.chat.length<=before)throw new Error('No generated assistant message');
   return [...c.chat].reverse().find(m=>!m.is_user&&!m.is_system)?.mes;
  },text);
  results.push({user:text,answer});console.log(JSON.stringify(results.at(-1)));
 }
 fs.writeFileSync('runtime/tavern-probe.json',JSON.stringify({mode:'actual SillyTavern browser Generate; no WeChat sending',results},null,2));
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});

