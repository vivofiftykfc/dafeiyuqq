import fs from 'node:fs';import path from 'node:path';import net from 'node:net';
const root=path.resolve(import.meta.dirname,'..');
let failed=0;
const check=(name,ok,detail='')=>{console.log(`[${ok?'OK':'MISSING'}] ${name}${detail?' — '+detail:''}`);if(!ok)failed++;};
check('Node.js >=24.22.1',Number(process.versions.node.split('.')[0])>24||(Number(process.versions.node.split('.')[0])===24&&Number(process.versions.node.split('.')[1])>=22),process.versions.node);
check('Personal bridge configuration',fs.existsSync(path.join(root,'qq-bridge/config.json')),'run npm run configure -- --owner-qq YOUR_NUMBER --bot-qq BOT_NUMBER');
check('QQ dependencies',fs.existsSync(path.join(root,'qq-bridge/node_modules/zod')),'npm ci --prefix qq-bridge');
check('SnowLuma runtime',fs.existsSync(path.join(root,'snowluma/index.mjs')),'download separately; do not copy another account configuration');
for(const [name,port] of [['DSH',18031],['QQ HTTP',3000],['QQ WebSocket',3001],['Bridge',3100]]){
 const up=await new Promise(resolve=>{const c=net.connect({host:'127.0.0.1',port});c.setTimeout(800);c.once('connect',()=>{c.destroy();resolve(true)});c.once('error',()=>resolve(false));c.once('timeout',()=>{c.destroy();resolve(false)})});
 console.log(`[${up?'UP':'DOWN'}] ${name} 127.0.0.1:${port}`);
}
console.log('A listening port does not prove account identity or successful replies. See docs/QUICKSTART.md for acceptance steps.');
process.exitCode=failed?1:0;
