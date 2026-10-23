import fs from 'node:fs';
import path from 'node:path';
import {loadStickerStore,saveStickerStore,normalizeStickerEntry} from '../src/sticker-lib.js';
const root=path.resolve(import.meta.dirname,'..');
const lock=path.join(root,'state','bridge.lock');
if(fs.existsSync(lock)) {
 const pid=Number(fs.readFileSync(lock,'utf8').trim());
 let running=false; if(pid>0){try{process.kill(pid,0);running=true;}catch{}}
 if(running){console.error('Bridge is already running. Close its window before starting again.');process.exit(1);}
}
const pack=JSON.parse(fs.readFileSync(path.join(root,'..','assets','whale-gifs','pack.json'),'utf8'));
const target=path.join(root,'state','stickers.json');
const store=loadStickerStore(target);
if(fs.existsSync(target))fs.copyFileSync(target,target+'.before-whale-pack.bak');
const map=new Map(store.map(e=>[e.id,e]));
for(const item of pack){if(!map.has(item.id))map.set(item.id,normalizeStickerEntry(item));}
saveStickerStore(target,[...map.values()]);
console.log(`Whale stickers ready: ${pack.length}; library total: ${map.size}`);
