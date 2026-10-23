import fs from 'node:fs';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {acquirePhone} from './phone-lease.js';
const exec=promisify(execFile);
const root=path.resolve(import.meta.dirname,'../..');
export async function desktopIdleSeconds(){
 const code=`Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class AutonomyIdle{[StructLayout(LayoutKind.Sequential)]public struct L{public uint size;public uint tick;}[DllImport("user32.dll")]public static extern bool GetLastInputInfo(ref L x);public static uint Read(){L x=new L();x.size=(uint)Marshal.SizeOf(x);if(!GetLastInputInfo(ref x))return 0;return unchecked((uint)Environment.TickCount-x.tick)/1000;}}';[AutonomyIdle]::Read()`;
 try{const r=await exec('powershell.exe',['-NoProfile','-Command',code],{windowsHide:true,timeout:10000});return Number(r.stdout.trim())||0;}catch{return 0;}
}
export function createArtifact(base,activity,filename,content){
 if(!/^[a-zA-Z0-9_-]{1,80}\.(html|svg|md|txt|js)$/.test(filename)||typeof content!=='string'||content.length>50000)throw Error('作品仅支持独立HTML、SVG、JS源码或文本，文件名和大小受限');
 if(!/^[a-zA-Z0-9-]+$/.test(activity))throw Error('活动ID无效');
 fs.mkdirSync(base,{recursive:true});const realBase=fs.realpathSync(base);if(realBase.toLowerCase()!==path.resolve(base).toLowerCase())throw Error('作品根目录不能是重定向路径');const dir=path.join(realBase,activity);fs.mkdirSync(dir,{recursive:true});
 const realDir=fs.realpathSync(dir);if(path.dirname(realDir)!==realBase)throw Error('作品目录越界');
 const file=path.join(realDir,filename);fs.writeFileSync(file,content,{flag:'wx'});return {file,created:true,executed:false};
}
export async function previewArtifact(file,{screenshot=true}={}){
 if(!/\.(html|svg)$/.test(file))return {executed:false,note:'保存为源码，不在主机执行'};
 const {chromium}=await import('../../tools/console-tests/node_modules/playwright-core/index.mjs');
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const timer=setTimeout(()=>void browser.close(),12000);
 try{
  const context=await browser.newContext({acceptDownloads:false,serviceWorkers:'block'});await context.route('**/*',r=>r.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message.slice(0,200)));page.on('popup',p=>void p.close());
  const html=fs.readFileSync(file,'utf8');
  // Unique-origin sandbox: scripts can draw/play but have no host files, forms, navigation or network.
  await page.setContent('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; frame-src \'self\'; connect-src \'none\'"><iframe sandbox="allow-scripts" style="width:100%;height:720px;border:0"></iframe>');
  await page.locator('iframe').evaluate((frame,body)=>frame.srcdoc=body,html);await page.waitForTimeout(600);
  const output=file+'.preview.png';if(screenshot)await page.screenshot({path:output});return {executed:true,isolated:true,errors,preview:screenshot?output:null};
 }finally{clearTimeout(timer);await browser.close();}
}
export async function phoneBrowse(app,{data,signal}={}){
 if(!['douyin','zhihu'].includes(app))throw Error('只允许抖音或知乎公开首页');
 if(await desktopIdleSeconds()<180)throw Error('主人正在使用电脑，手机自主浏览延后');
 const cfg=JSON.parse(fs.readFileSync(path.join(data,'phone.json'),'utf8'));const adb=async args=>(await exec(cfg.adb,['-s',cfg.serial,...args],{windowsHide:true,timeout:15000,signal})).stdout;
 // Do not wake/unlock or take over an unrelated foreground app.
 const policy=await adb(['shell','dumpsys','window','policy']);
 if(/(?:mShowingLockscreen|isStatusBarKeyguard|showing|mKeyguardShowing)=true/i.test(policy))throw Error('手机锁屏，暂停');
 const power=await adb(['shell','dumpsys','power']);if(!/mWakefulness=Awake/.test(power))throw Error('手机未亮屏，不自动解锁');
 const window=await adb(['shell','dumpsys','window','windows']);const focus=window.split('\n').find(l=>l.includes('mCurrentFocus'))||'';
 if(!/com\.ss\.android\.ugc\.aweme|com\.zhihu\.android|com\.huawei\.android\.launcher|com\.android\.launcher/.test(focus))throw Error('手机当前不在允许的公开浏览应用，避免打断');
 const release=acquirePhone(data,'随机自主浏览');const client=new Client({name:'autonomy-phone',version:'1'});
 try{
  await client.connect(new StdioClientTransport({command:path.join(root,'snowluma/node.exe'),args:[path.join(root,'tutorial-kit/packages/phone-mcp/src/phone-mcp.js')],env:{...process.env,PHONE_ADB:cfg.adb,PHONE_SERIAL:cfg.serial,PHONE_SHOT_DIR:path.join(data,'autonomy-shots')}}));
  const call=async(name,args={})=>{signal?.throwIfAborted();const r=await client.callTool({name,arguments:args},undefined,{timeout:45000});if(r.isError)throw Error('手机动作未成功：'+name);return r;};
  await call('phone_open_app',{pkg:app==='douyin'?'com.ss.android.ugc.aweme':'com.zhihu.android'});
  await call('phone_tap_text',{text:'首页',index:0});
  const views=[];let image;
  for(let i=0;i<2;i++){
   const d=await call('phone_dump',{max:80});const text=d.content.filter(c=>c.type==='text').map(c=>c.text).join('\n');
   if(!/推荐|关注|热榜|首页|回答|视频/.test(text)||/聊天详情|发送消息|支付密码|收银台|验证码/.test(text))throw Error('未确认公开内容页面，停止浏览');
   const shot=await call('phone_screenshot',{note:'autonomy'});image=shot.content.find(c=>c.type==='image');views.push(text);
   if(i===0){const size=await adb(['shell','wm','size']);const [,w,h]=size.match(/(\d+)x(\d+)/)||[];if(!w||!h)break;await call('phone_swipe',{x1:Math.floor(+w/2),y1:Math.floor(+h*.72),x2:Math.floor(+w/2),y2:Math.floor(+h*.35),ms:500});}
  }
  return {source:app+'公开推荐页',text:views.join('\n---\n'),image,note:'只观察了可见界面文字与截图，不代表完整看过视频或听过声音'};
 }finally{await client.close().catch(()=>{});release();}
}
