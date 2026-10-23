import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

export function zhihuUrl(raw){
 const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('需要知乎 HTTPS 回答或文章链接');
 let m;if(u.hostname==='www.zhihu.com'&&(m=u.pathname.match(/^\/question\/(\d+)\/answer\/(\d+)\/?$/)))return {key:'answer:'+m[2],url:`https://www.zhihu.com/question/${m[1]}/answer/${m[2]}`,type:'answer'};
 if(u.hostname==='zhuanlan.zhihu.com'&&(m=u.pathname.match(/^\/p\/(\d+)\/?$/)))return {key:'article:'+m[1],url:`https://zhuanlan.zhihu.com/p/${m[1]}`,type:'article'};
 throw Error('请选择具体回答或文章，不能只给问题首页');
}

// This function is the complete browser-side program. No model-supplied JavaScript is executed.
export async function zhihuPageOperation(page,arg){
 const allowed=u=>{const x=new URL(u);return x.protocol==='https:'&&['www.zhihu.com','zhuanlan.zhihu.com'].includes(x.hostname)&&!x.username&&!x.password&&!x.port;};
 const guard=async()=>{if(!allowed(page.url()))throw Error('所选标签页不在知乎，请选择知乎标签页');if(/安全验证|访问受限|异常请求|验证码/.test(await page.title())||await page.locator('.Captcha:visible, .Captcha-chinese:visible, iframe[src*="captcha"]:visible').count())throw Error('知乎要求人工验证，已停止');};
 const account=async()=>{
  await guard();
  let links=page.locator('.AppHeader-userInfo a[href*="/people/"], .AppHeader-profile a[href*="/people/"]');
  if(!await links.count()){
   const avatar=page.locator('.AppHeader-profile button, button.AppHeader-profileEntry');
   if(await avatar.count()===1&&await avatar.isVisible())await avatar.click();
   links=page.locator('.Menu a[href*="/people/"], [role="menu"] a[href*="/people/"]');
  }
  const values=[];for(const a of await links.all()){if(!await a.isVisible())continue;const href=await a.getAttribute('href'),u=new URL(href,page.url()),m=u.pathname.match(/^\/people\/([^/]+)\/?$/);if(u.hostname==='www.zhihu.com'&&m)values.push({uid:m[1],name:(await a.innerText()).trim()||m[1]});}
  const ids=[...new Set(values.map(v=>v.uid))];if(ids.length!==1)throw Error('未能唯一核验登录账号，请登录并展开头像菜单后重试');return values[0];
 };
 await guard();
 if(arg.op==='attach')return {url:page.url(),title:await page.title()};
 if(arg.op==='account')return account();
 if(arg.uid&&(await account()).uid!==arg.uid)throw Error('知乎登录账号已变化');
 if(arg.op==='discover'){
  await page.goto('https://www.zhihu.com/',{waitUntil:'domcontentloaded',timeout:30000});await guard();
  await page.locator('a[href*="/answer/"], a[href*="zhuanlan.zhihu.com/p/"]').first().waitFor({timeout:10000});
  return page.locator('a[href*="/answer/"], a[href*="zhuanlan.zhihu.com/p/"]').evaluateAll(xs=>xs.slice(0,80).map(x=>({url:x.href,title:(x.innerText||x.getAttribute('title')||'').slice(0,200)})));
 }
 if(!arg.url||!allowed(arg.url))throw Error('目标链接无效');
 if(page.url().split('?')[0]!==arg.url)await page.goto(arg.url,{waitUntil:'domcontentloaded',timeout:30000});await guard();
 const target=()=>page.url().split(/[?#]/)[0].replace(/\/$/,'')===arg.url.replace(/\/$/,'');
 if(!target())throw Error('页面重定向到其他内容，停止操作');
 const root=page.locator(arg.type==='article'?'.Post-Main':'.QuestionAnswer-content .AnswerItem, .AnswerCard .AnswerItem');
 if(await root.count()!==1)throw Error('无法唯一定位文章或回答正文，等待页面加载后重试');
 if(arg.op==='read'){
  const expand=root.getByRole('button',{name:/展开阅读全文|阅读全文/});if(await expand.count()===1&&await expand.isVisible())await expand.click();
  const body=root.locator(arg.type==='article'?'.Post-RichTextContainer, .RichText.ztext':'.RichContent-inner .RichText, .RichContent-inner .ztext').first();
  await body.waitFor({state:'visible',timeout:10000});
  const full=await body.innerText();if(full.trim().length<40)throw Error('未获取到足够正文，不生成感受或评论');
  const truncated=full.length>24000,partial=truncated||(await expand.count()>0&&await expand.first().isVisible())||/购买后|会员专享|开通会员|付费阅读/.test(full);
  await body.scrollIntoViewIfNeeded();
  const comments=(await root.locator('.CommentItem-content, .CommentContent').allTextContents()).slice(0,12).map(x=>x.slice(0,600));
  const title=await page.locator('h1').first().innerText();const author=await root.locator('.AuthorInfo-name').first().innerText().catch(()=>'未识别');
  if(!target())throw Error('阅读期间页面被切换');
  return {url:arg.url,title:title.slice(0,250),author,text:full.slice(0,24000),comments,partial,limitations:partial?'只读取到部分正文；不得声称读完':'读取了当前页面可见正文；未验证图片、视频及未展开的评论'};
 }
 if(arg.op==='prepare'||arg.op==='commit'){
  if((await account()).uid!==arg.uid)throw Error('发布账号不匹配');
  const toggle=root.getByRole('button',{name:/评论/}).filter({hasNotText:/收起/});
  let editor=root.locator('textarea:visible, [contenteditable="true"][role="textbox"]:visible');
  if(!await editor.count()&&await toggle.count()===1){await toggle.click();editor=root.locator('textarea:visible, [contenteditable="true"][role="textbox"]:visible');}
  if(await editor.count()!==1)throw Error('无法唯一定位当前内容的评论框');
  if(arg.op==='prepare'){await editor.fill(arg.text);return {prepared:true};}
  const value=await editor.evaluate(e=>'value'in e?e.value:e.innerText);if(value.trim()!==arg.text.trim())throw Error('评论框内容发生变化，拒绝发布');
  const submit=root.getByRole('button',{name:/^(发布|发表评论)$/});if(await submit.count()!==1||!await submit.isEnabled())throw Error('无法唯一定位发布按钮');
  await guard();if(!target())throw Error('发布目标变化');await submit.click({timeout:8000});
  // Only an author-matched rendered comment counts. A click / toast is not a receipt.
  const rows=root.locator('.CommentItem, .CommentItemV2');
  for(let i=0;i<4;i++){await page.waitForTimeout(750);await guard();if(!target())break;for(const item of await rows.all()){
   const owners=await item.locator('a[href*="/people/"]').evaluateAll(xs=>xs.map(x=>x.getAttribute('href')));
   const author=owners.some(h=>{try{return new URL(h,'https://www.zhihu.com').pathname.replace(/\/$/,'')==='/people/'+arg.uid;}catch{return false;}});
   if(author&&(await item.locator('.CommentItem-content, .CommentContent').allTextContents()).some(x=>x.trim()===arg.text.trim()))return {confirmed:true,id:await item.getAttribute('data-id')};
  }}return {confirmed:false};
 }
 throw Error('不支持的知乎浏览动作');
}

export class ZhihuBrowser {
 constructor({clientFactory}={}){this.clientFactory=clientFactory;this.client=null;this.connected=false;}
 async connect(){
  if(this.client)return;
  const client=this.clientFactory?await this.clientFactory():new Client({name:'dafeiyu-zhihu',version:'1.0'});
  if(!this.clientFactory){const root=path.resolve(import.meta.dirname,'../..');await client.connect(new StdioClientTransport({command:path.join(root,'snowluma/node.exe'),args:[path.join(root,'tools/chrome-bridge/node_modules/@playwright/mcp/cli.js'),'--extension','--browser','chrome'],cwd:root,stderr:'pipe'}));}
  this.client=client;const list=await client.listTools();this.codeTool=list.tools.find(t=>/^browser_run_code(?:_unsafe)?$/.test(t.name))?.name;if(!this.codeTool)throw Error('浏览器适配器版本不支持固定动作执行');
 }
 async run(arg){await this.connect();const code=`async (page) => 'DAFEIYU_RESULT:'+JSON.stringify(await (${zhihuPageOperation.toString()})(page,${JSON.stringify(arg)}))`;
  try{const r=await this.client.callTool({name:this.codeTool,arguments:{code}},undefined,{timeout:60000});if(r.isError)throw Error('Chrome 操作失败；请检查扩展连接、知乎登录或页面验证');
   const text=r.content.filter(c=>c.type==='text').map(c=>c.text).join('\n');
   const line=text.split('\n').find(x=>x.includes('DAFEIYU_RESULT:'));if(!line)throw Error('浏览器未返回可核验结果');
   let payload=line.trim();if(payload.startsWith('"'))payload=JSON.parse(payload);payload=payload.slice(payload.indexOf('DAFEIYU_RESULT:')+15);return JSON.parse(payload);
  }catch(e){this.connected=false;throw e;}
 }
 async open(){const r=await this.run({op:'attach'});this.connected=true;return r;}
 async account(){return this.run({op:'account'});}
 async recommendations(uid){const rows=await this.run({op:'discover',uid});const seen=new Set();return rows.flatMap(r=>{try{const v=zhihuUrl(r.url);if(seen.has(v.key)||!r.title.trim())return [];seen.add(v.key);return [{...v,title:r.title}];}catch{return [];}}).slice(0,12);}
 async read(url,uid){return this.run({op:'read',...zhihuUrl(url),uid});}
 async publish(url,text,uid,beforeCommit){const target=zhihuUrl(url);await this.run({op:'prepare',...target,text,uid});await beforeCommit();return this.run({op:'commit',...target,text,uid});}
 async close(){this.connected=false;await this.client?.close();this.client=null;/* Detach only: never close the user's Chrome. */}
}
