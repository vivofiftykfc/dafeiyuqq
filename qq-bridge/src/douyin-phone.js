import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import {parseUI,byId,label,box,title,chatSnapshot,signature,ACCOUNT,FRIENDS,PKG} from './douyin-ui.js';
const exec=promisify(execFile);
export class DouyinPhone {
  constructor(dir){this.dir=dir;this.cfg=JSON.parse(fs.readFileSync(path.join(dir,'phone.json'),'utf8'));}
  async adb(args,signal){signal?.throwIfAborted();return (await exec(this.cfg.adb,['-s',this.cfg.serial,...args],{windowsHide:true,timeout:18000,maxBuffer:4*1024*1024,signal})).stdout;}
  async ui(signal){
    signal?.throwIfAborted();
    const root=path.resolve(import.meta.dirname,'../..');
    const r=await exec(path.join(root,'tools/douyin-uiauto/Scripts/python.exe'),[path.join(root,'qq-bridge/scripts/douyin-dump.py'),this.cfg.serial],{windowsHide:true,timeout:25000,maxBuffer:4*1024*1024,signal,env:{...process.env,ADBUTILS_ADB_PATH:this.cfg.adb,PYTHONIOENCODING:'utf-8'}});
    return parseUI(r.stdout);
  }
  async tap(n,signal){n=box(n);if(!n)throw Error('界面按钮无可见位置');const [x,y,r,b]=n.b;await this.adb(['shell','input','tap',String(Math.round((x+r)/2)),String(Math.round((y+b)/2))],signal);await delay(400,undefined,{signal});}
  async unlocked(signal){const s=await this.adb(['shell','dumpsys','window','policy'],signal);if(/(?:isStatusBarKeyguard|mShowingLockscreen|showing)\s*=\s*true/.test(s))throw Error('手机已锁屏，请解锁后重新开启');}
  async main(signal){
    await this.unlocked(signal);
    let n=await this.ui(signal);
    if(n.length&&n.every(x=>x.package==='com.android.systemui')){await this.adb(['shell','cmd','statusbar','collapse'],signal);n=await this.ui(signal);}
    if(title(n)) {
      const back=n.filter(x=>/^(?:返回(?:未读\d+条消息)?|关闭)$/.test(x['content-desc'])&&x.clickable==='true'&&x.b[0]===0&&x.b[1]<600);
      if(back.length!==1)throw Error('找不到唯一聊天返回按钮（'+back.length+'）');
      if(byId(n,'msg_et').some(x=>x.text&&!x.text.includes('发消息或按住说话')))throw Error('聊天框有未发送草稿，已暂停');
      await this.tap(back[0],signal);n=await this.ui(signal);
    }
    if(!byId(n,'0py').some(x=>x.text==='我'))throw Error('请将手机停在抖音首页或消息列表后开启');
    return n;
  }
  async verifyAccount(signal){
    let n=await this.main(signal);
    await this.tap(byId(n,'0py').find(x=>x.text==='我'),signal);n=await this.ui(signal);
    const ids=byId(n,'50g');
    if(ids.length!==1||label(ids[0]).replace(/\D/g,'')!==ACCOUNT)throw Error('抖音账号不匹配，停止自动回复');
    if(!byId(n,'0py').some(x=>x.text==='消息')){await this.adb(['shell','cmd','statusbar','collapse'],signal);n=await this.ui(signal);}
    const tab=byId(n,'0py').find(x=>x.text==='消息');if(!tab)throw Error('消息入口不可见');
    await this.tap(tab,signal);
  }
  async open(friend,signal){
    if(!FRIENDS.includes(friend))throw Error('好友不在白名单');
    let n=await this.main(signal);
    if(!byId(n,'tv_title').some(x=>label(x)==='消息')){await this.tap(byId(n,'0py').find(x=>x.text==='消息'),signal);n=await this.ui(signal);}
    // Only the visible, exact-name conversation rows. No global search/private contacts.
    const find=()=>n.filter(x=>label(x)===friend&&x.b[0]>200&&x.b[1]>450&&x.b[3]<2259);
    let matches=find();
    for(let i=0;!matches.length&&i<8;i++){
      if(!byId(n,'tv_title').some(x=>label(x)==='消息'))throw Error('消息列表已切换，停止导航');
      await this.adb(['shell','input','swipe','700','800','700','2000','300'],signal);n=await this.ui(signal);matches=find();
    }
    if(matches.length!==1)throw Error('消息列表中找不到唯一好友：'+friend+'；请让这5个会话位于列表顶部');
    await this.tap(matches[0],signal);n=await this.ui(signal);
    if(title(n)===friend&&!byId(n,'msg_et').length){
      const keyboard=byId(n,'d3q').filter(x=>label(x)==='文本');
      if(keyboard.length!==1)throw Error('无法切换到文字输入');
      await this.tap(keyboard[0],signal);await this.adb(['shell','input','keyevent','4'],signal);n=await this.ui(signal);
    }
    const snap=chatSnapshot(n,friend);
    const input=byId(n,'msg_et')[0];
    if(input.text&&!input.text.includes('发消息或按住说话'))throw Error('聊天框有未发送草稿：'+friend);
    return snap;
  }
  async screenshot(friend,signal){
    const folder=path.join(this.dir,'phone-shots');fs.mkdirSync(folder,{recursive:true});
    const name='douyin-auto-'+Date.now()+'.png';
    const r=await exec(this.cfg.adb,['-s',this.cfg.serial,'exec-out','screencap','-p'],{windowsHide:true,timeout:12000,maxBuffer:8*1024*1024,encoding:'buffer',signal});
    fs.writeFileSync(path.join(folder,name),r.stdout);return name;
  }
  async send(friend,text,expected,signal,beforeCommit){
    // Verify account again after model generation, then reopen and compare the complete visible tail.
    await this.verifyAccount(signal);
    let snap=await this.open(friend,signal);
    if(JSON.stringify(snap.messages)!==JSON.stringify(expected)){const e=Error('聊天已有变化，旧回复作废');e.code='CHAT_CHANGED';throw e;}
    let n=await this.ui(signal);chatSnapshot(n,friend);
    await this.tap(byId(n,'msg_et')[0],signal);
    const old=(await this.adb(['shell','settings','get','secure','default_input_method'],signal)).trim();
    let typed=false,committed=false;
    try {
      await this.adb(['shell','ime','enable','com.android.adbkeyboard/.AdbIME'],signal);
      await this.adb(['shell','ime','set','com.android.adbkeyboard/.AdbIME'],signal);
      await delay(1500,undefined,{signal});
      await this.adb(['shell','am','broadcast','-a','ADB_INPUT_B64','--es','msg',Buffer.from(text).toString('base64')],signal);typed=true;
      // Restore keyboard before inspecting; some keyboards shift the send button.
      await this.adb(['shell','ime','set',old]);
      await delay(700,undefined,{signal});n=await this.ui(signal);
      const latest=chatSnapshot(n,friend);
      if(signature(latest.messages.at(-1)||{})!==signature(expected.at(-1)||{})){const e=Error('输入期间聊天已有变化，旧回复作废');e.code='CHAT_CHANGED';throw e;}
      if(byId(n,'msg_et')[0]?.text!==text)throw Error('输入内容未完整验证，未发送');
      const send=n.filter(x=>label(x)==='发送'&&x.b[0]>600&&x.b[1]>1000);
      if(send.length!==1)throw Error('无法唯一识别发送按钮');
      // Synchronous commit guard: OFF cannot race with an awaited operation before input tap.
      signal.throwIfAborted();beforeCommit();committed=true;
      await this.tap(send[0],signal);
      await delay(600,undefined,{signal});n=await this.ui(signal);
      const after=chatSnapshot(n,friend);
      if(after.messages.at(-1)?.direction!=='out'||after.messages.at(-1)?.text!==text)throw Error('发送结果不确定；不会自动重试');
      return {messages:after.messages,screenshot:await this.screenshot(friend,signal)};
    } finally {
      await this.adb(['shell','ime','set',old]).catch(()=>{});
      // If canceled before send, clear only our exact draft in this exact chat.
      if(typed&&!committed){try{const now=await this.ui();if(title(now)===friend&&byId(now,'msg_et')[0]?.text===text){await this.adb(['shell','ime','set','com.android.adbkeyboard/.AdbIME']);await delay(1500);await this.adb(['shell','am','broadcast','-a','ADB_CLEAR_TEXT']);await this.adb(['shell','ime','set',old]);}}catch{}}
    }
  }
}
