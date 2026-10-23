import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
export async function stopDouyin({request}){
 const s=await request({enabled:false});
 if(s.enabled!==false)throw Error('未确认抖音回复已关闭，请查看控制台状态');
 return {connected:s.connected,enabled:false,phase:s.phase};
}
export async function startDouyin({request,connectOnly=false,timeout=45000,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 const deadline=now()+timeout;
 const wait=async predicate=>{for(;;){const s=await request();if(predicate(s))return s;if(now()>=deadline)throw Error('抖音尚未就绪；请在后台检查登录/验证状态。其他服务不受影响。');await sleep(1000);}};
 let s=await request();
 if(s.transport!=='direct')throw Error('当前桥接未加载抖音协议接入，请先重启桥接');
 if(!s.connected&&!s.rosterBusy)await request({action:'connect'});
 if(!s.connected||s.rosterBusy)s=await wait(s=>s.connected&&!s.rosterBusy);
 if(connectOnly)return {connected:s.connected,enabled:s.enabled,phase:s.phase};
 const friends=(s.roster||[]).filter(f=>f.reply===true).map(f=>f.name);
 if(!friends.length)throw Error('抖音已连接，但没有获准自动回复的好友；请先在后台设置名单。');
 // Never expand the allowlist or retry an uncertain enabling request.
 if(!s.enabled)await request({enabled:true,friends});
 s=await wait(s=>s.connected&&s.enabled&&s.baselineCount>0&&String(s.phase).startsWith('实时监听'));
 return {connected:true,enabled:true,phase:s.phase,friends:friends.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{
  const root=path.resolve(import.meta.dirname,'..'),cfg=JSON.parse(fs.readFileSync(path.join(root,'qq-bridge/config.json'),'utf8').replace(/^\uFEFF/,''));
  let token=String(cfg.consoleToken||'').trim();if(!/^[A-Za-z0-9_-]{16,128}$/.test(token))token=fs.readFileSync(path.join(root,'qq-bridge/state/console-token'),'utf8').trim();
  const request=async body=>{const r=await fetch(`http://127.0.0.1:${cfg.consolePort||3100}/api/douyin-auto`,{method:body?'POST':'GET',headers:{'X-Console-Token':token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('抖音控制接口拒绝请求，请检查后台状态');return r.json();};
  const s=process.argv.includes('--stop')?await stopDouyin({request}):await startDouyin({request,connectOnly:process.argv.includes('--connect-only')});
  console.log(`[OK] Douyin connected=${s.connected}; auto-reply=${s.enabled}; ${s.phase}`);
 }catch(e){console.error('[ACTION] '+(e.message==='fetch failed'?'无法连接桥接后台，请先双击「一键启动大肥鱼.cmd」，再重试。':e.message));process.exitCode=1;}
}
