import {chatMemory} from './chat-memory.js';
import {randomUUID} from 'node:crypto';
export function wechatRemember(account,peer,role,text,id){
  if(!account||!peer)return;
  // A memory failure must never turn an acknowledged send into a send retry.
  try{chatMemory().append('wechat',String(account),String(peer),{id:id||randomUUID(),role,text,sender:role==='in'?String(peer):String(account)});}catch(e){console.warn('[chat-memory] WeChat write failed:',e.message);}
}
export function wechatContext(account,peer){if(!account||!peer)return '';try{return chatMemory().block('wechat',String(account),String(peer));}catch{return '';}}
