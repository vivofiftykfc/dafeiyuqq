import fs from 'node:fs';
import path from 'node:path';
import {createClient} from '../../tools/douyin-im/lib/index.js';
import {FRIENDS} from '../src/douyin-ui.js';
const dir=path.resolve(import.meta.dirname,'../state/owner/douyin-direct');
const client=createClient({dataDir:dir,localState:false});
let account;
client.on('system.online',e=>{account=e.account;});
client.on('system.login.qrcode',()=>{throw Error('需要重新扫码');});
try {
  await client.login();
  if(!account)throw Error('未连接');
  const contacts=await account.getFriendList();
  const friends={};
  for(const name of FRIENDS){const matches=contacts.filter(f=>[f.nickname,f.remark].some(n=>n?.toLowerCase()===name.toLowerCase()));if(matches.length===1)friends[name]=matches[0].uid;console.log(name+': '+(matches.length===1?'唯一匹配':'匹配数量 '+matches.length));}
  fs.writeFileSync(path.join(dir,'binding.json'),JSON.stringify({uid:account.uid,nickname:account.nickname,friends},null,2));
  console.log('绑定账号: '+account.nickname+'；只读取联系人，未发消息');
}finally{await client.logout();}
