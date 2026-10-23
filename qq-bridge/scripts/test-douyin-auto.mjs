import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DouyinAuto} from '../src/douyin-auto.js';
import {newMessages,parseUI,chatSnapshot,FRIENDS} from '../src/douyin-ui.js';
import {apply,publicPersona} from '../plugins/qq-agent-presets/douyin-chat.mjs';
import {acquirePhone} from '../src/phone-lease.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'douyin-auto-test-'));
const incoming=text=>({direction:'in',kind:'text',text}),outgoing=text=>({direction:'out',kind:'text',text});
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('initial history ignored',()=>assert.equal(newMessages(undefined,[incoming('old')]).baseline,true));
test('unchanged is not repeated',()=>assert.deepEqual(newMessages([incoming('a')],[incoming('a')]).messages,[]));
test('same text appended is new',()=>assert.equal(newMessages([incoming('a')],[incoming('a'),incoming('a')]).messages.length,1));
test('lost overlap resets, never replays',()=>assert.equal(newMessages([incoming('a')],[incoming('b')]).baseline,true));
test('sliding window overlap',()=>assert.equal(newMessages([incoming('a'),outgoing('b')],[outgoing('b'),incoming('c')]).messages.length,1));
test('real chat direction parsed by avatar',()=>{const file=path.resolve(import.meta.dirname,'../state/owner/douyin-auto-chat.xml');const s=chatSnapshot(parseUI(fs.readFileSync(file,'utf8')),'SAM');assert.equal(s.messages.at(-1).direction,'in');assert.equal(s.messages.at(-2).direction,'out');assert.throws(()=>chatSnapshot(parseUI(fs.readFileSync(file,'utf8')),'example_friend'));});
test('malformed UI rejected',()=>assert.throws(()=>parseUI('<hierarchy><node/>')));
test('consecutive incoming bubbles without repeated avatars are retained',()=>{
 const pkg='com.ss.android.ugc.aweme:id/';
 const row=t=>`<node bounds="[0,400][1088,500]"><node resource-id="${pkg}m6m" bounds="[163,400][1053,500]"><node resource-id="${pkg}swa" content-desc="${t}" bounds="[163,400][400,500]"/></node></node>`;
 const xml=`<hierarchy><node resource-id="${pkg}vws" text="example_friend"/><node resource-id="${pkg}msg_et"/><node resource-id="${pkg}v6m" bounds="[0,237][1088,2093]">${row('a')}${row('b')}${row('b')}</node></hierarchy>`;
 const s=chatSnapshot(parseUI(xml),'example_friend');assert.deepEqual(s.messages.map(m=>m.text),['a','b','b']);assert(s.messages.every(m=>m.direction==='in'));
});
test('no tools, guard denies even inherited tools',()=>{let filter,guard;apply({tools:{restrict:f=>filter=f,guard:g=>guard=g},effect:()=>{}});assert.deepEqual(filter,{allow:[]});assert.match(guard({name:'pwsh'}),/没有工具/);});
test('private owner facts never in public persona',()=>{const d=path.join(dir,'persona');fs.mkdirSync(d);fs.writeFileSync(path.join(d,'identity.md'),'blue whale');fs.writeFileSync(path.join(d,'memory.json'),'PRIVATE_SENTINEL');assert(!publicPersona(d).includes('PRIVATE_SENTINEL'));});
test('phone lease excludes concurrent workers',()=>{const release=acquirePhone(dir,'test');assert.throws(()=>acquirePhone(dir,'other'),/正在被使用/);release();acquirePhone(dir,'next')();});
async function scenario(name,body){await body();passed++;console.log('PASS '+name);}
function fixture(reply=async()=> 'hello'){
  let tail=[outgoing('old')],sends=0;
  const phone={verifyAccount:async()=>{},open:async friend=>({friend,messages:[...tail]}),screenshot:async()=> 'test.png',send:async(friend,text,expected,signal,commit)=>{signal.throwIfAborted();commit();sends++;tail=[...tail,outgoing(text)];return {messages:tail,screenshot:'test.png'};}};
  const c=new DouyinAuto(fs.mkdtempSync(path.join(dir,'case-')),{phone,model:{reply},lease:()=>()=>{},interval:999999});
  c.start();clearTimeout(c.timer);
  const tick=async()=>{clearTimeout(c.timer);await c.tick();clearTimeout(c.timer);};
  return {c,phone,tick,setTail:t=>tail=t,sends:()=>sends};
}
await scenario('five baselines, new message once, restart OFF',async()=>{const f=fixture();for(let i=0;i<5;i++)await f.tick();assert.equal(f.sends(),0);assert.equal(f.c.status().baselineCount,5);f.setTail([outgoing('old'),incoming('new')]);await f.tick();assert.equal(f.sends(),1);f.c.index=0;await f.tick();assert.equal(f.sends(),1);f.c.stop();assert.equal(new DouyinAuto(dir).enabled,false);});
await scenario('OFF during generation invalidates reply',async()=>{let resolve;const f=fixture(()=>new Promise(r=>resolve=r));await f.tick();f.c.index=0;f.setTail([outgoing('old'),incoming('new')]);const p=f.tick();while(!resolve)await new Promise(r=>setImmediate(r));f.c.stop();resolve('too late');await p;assert.equal(f.sends(),0);assert.equal(f.c.enabled,false);});
await scenario('OFF immediately before commit prevents send',async()=>{const f=fixture();await f.tick();f.c.index=0;f.setTail([outgoing('old'),incoming('new')]);f.phone.send=async(a,b,c,s,commit)=>{f.c.stop();commit();throw Error('unreachable');};await f.tick();assert.equal(f.sends(),0);});
await scenario('wrong account pauses without send',async()=>{const f=fixture();f.phone.verifyAccount=async()=>{throw Error('账号不匹配');};await f.tick();assert.equal(f.c.enabled,false);assert.equal(f.sends(),0);});
await scenario('outgoing messages do not trigger reply',async()=>{const f=fixture();await f.tick();f.c.index=0;f.setTail([outgoing('old'),outgoing('manual')]);await f.tick();assert.equal(f.sends(),0);f.c.stop();});
await scenario('uncertain send is logged and never retried',async()=>{const f=fixture();await f.tick();f.c.index=0;f.setTail([outgoing('old'),incoming('new')]);f.phone.send=async(a,b,c,s,commit)=>{commit();throw Error('network lost');};await f.tick();assert.equal(f.c.enabled,false);assert(f.c.status().events.some(e=>e.type==='uncertain'));await f.tick();assert.equal(f.sends(),0);});
await scenario('media last message is not hallucinated',async()=>{const f=fixture();await f.tick();f.c.index=0;f.setTail([outgoing('old'),{direction:'in',kind:'media',text:'[非文字消息]'}]);await f.tick();assert.equal(f.sends(),0);f.c.stop();});
await scenario('text followed by sticker still receives text reply',async()=>{const f=fixture();await f.tick();f.c.index=0;f.setTail([outgoing('old'),incoming('hello'),{direction:'in',kind:'media',text:'[非文字消息]'}]);await f.tick();assert.equal(f.sends(),1);f.c.stop();});
await scenario('new incoming while generating drops stale response but keeps polling',async()=>{const f=fixture();await f.tick();f.c.index=0;f.setTail([outgoing('old'),incoming('new')]);f.phone.send=async()=>{throw Object.assign(Error('changed'),{code:'CHAT_CHANGED'});};await f.tick();assert.equal(f.sends(),0);assert.equal(f.c.enabled,true);f.c.stop();});
await scenario('only selected authorized friends can run',async()=>{const f=fixture();f.c.stop();assert.throws(()=>f.c.start(['stranger']));assert.throws(()=>f.c.start([]));f.c.start(['example_friend']);clearTimeout(f.c.timer);await f.tick();assert.deepEqual(f.c.status().friends,['example_friend']);assert.equal(f.c.currentFriend,'example_friend');f.c.stop();});
console.log(`${passed} tests passed. Temporary evidence: ${dir}`);
