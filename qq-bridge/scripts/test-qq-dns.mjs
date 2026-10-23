import assert from 'node:assert/strict';
import dns from 'node:dns';
import https from 'node:https';
import {EventEmitter} from 'node:events';

const oldLookup=dns.promises.lookup, oldRequest=https.request;
let answer='123.54.199.83', question='gxh.vip.qq.com', requests=[];
dns.promises.lookup=async()=>[{address:'28.0.0.27',family:4},{address:'2001:2::35',family:6}];
https.request=(options,callback)=>{
  requests.push(options);
  const req=new EventEmitter(); req.destroy=()=>{};
  req.end=()=>queueMicrotask(()=>{
    const res=new EventEmitter();res.statusCode=200;res.headers={};res.complete=true;res.destroy=()=>{};
    callback(res);
    res.emit('data',Buffer.from(JSON.stringify({Status:0,Question:[{name:question,type:1}],Answer:[{type:1,data:answer,TTL:0}]})));
    res.emit('end');
  });
  return req;
};
try{
  const m=await import('../src/safe-fetch.js?qq-dns-test');
  assert.deepEqual(await m.resolveSafeAddresses('gxh.vip.qq.com'),['123.54.199.83']);
  assert.equal(requests[0].hostname,'1.1.1.1');
  assert.equal(requests[0].rejectUnauthorized,true);
  assert.equal(requests[0].headers.accept,'application/dns-json');
  const count=requests.length;
  await assert.rejects(m.resolveSafeAddresses('untrusted.example'),/内网/);
  await assert.rejects(m.resolveSafeAddresses('gxh.vip.qq.com.evil.example'),/内网/);
  await assert.rejects(m.resolveSafeAddresses('127.0.0.1'),/内网/);
  assert.equal(requests.length,count,'Unlisted and local hosts must not use fallback');
  answer='127.0.0.1';
  await assert.rejects(m.resolveSafeAddresses('gxh.vip.qq.com'),/安全地址/);
  answer='123.54.199.83';question='wrong.example';
  await assert.rejects(m.resolveSafeAddresses('gxh.vip.qq.com'),/不匹配/);
  console.log('PASS QQ fake-DNS fallback, fixed TLS endpoint, exact host scope, private DNS answers and question mismatch');
}finally{dns.promises.lookup=oldLookup;https.request=oldRequest;}
