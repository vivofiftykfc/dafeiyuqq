import fs from 'node:fs';
import path from 'node:path';
// Cross-process, fail-closed lease shared by the MCP adapter and console worker.
export function acquirePhone(dir, owner) {
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'phone-use.lock');
  const token=crypto.randomUUID();
  for(let attempt=0;attempt<2;attempt++) {
    try { const fd=fs.openSync(file,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,token,owner,at:new Date().toISOString()}));fs.closeSync(fd);return ()=>{try{if(JSON.parse(fs.readFileSync(file)).token===token)fs.unlinkSync(file);}catch{}}; }
    catch(e) {
      if(e.code!=='EEXIST')throw e;
      let old;try{old=JSON.parse(fs.readFileSync(file));}catch{throw Error('手机操作锁不可读，请检查 phone-use.lock');}
      let alive=true;try{process.kill(old.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;}
      if(alive)throw Error('手机正在被使用：'+old.owner);
      fs.unlinkSync(file);
    }
  }
  throw Error('手机操作锁竞争，请稍后重试');
}
