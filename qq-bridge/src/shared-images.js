import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {safeFetchBuffer} from './safe-fetch.js';
export const sharedDir=path.resolve(import.meta.dirname,'../../assets/shared');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export async function collectImage(url,sourcePage){
 const source=new URL(sourcePage);if(source.protocol!=='https:'||source.username||source.password)throw Error('Public HTTPS source page required');
 const r=await safeFetchBuffer(url,8*1024*1024,{publicDnsFallback:true});
 const b=r.buffer;const id=hash(b);
 const ext=b.subarray(0,3).toString('hex')==='ffd8ff'?'jpg':b.subarray(0,4).toString()==='GIF8'?'gif':b.subarray(0,4).toString()==='RIFF'?'webp':'png';
 fs.mkdirSync(sharedDir,{recursive:true});
 const file=path.join(sharedDir,id+'.'+ext),meta=path.join(sharedDir,id+'.json');
 fs.writeFileSync(file,b);
 if(!fs.existsSync(meta))fs.writeFileSync(meta,JSON.stringify({id,file,sourcePage:source.href,imageUrl:r.url,bytes:b.length,createdAt:new Date().toISOString()},null,2));
 return {id,file,sourcePage:source.href,instruction:'Inspect this image with read_image before sharing. A successful download is not a content review.'};
}
export function sharedImage(id){
 if(!/^[a-f0-9]{64}$/.test(id))throw Error('Invalid collected image id');
 const row=JSON.parse(fs.readFileSync(path.join(sharedDir,id+'.json'),'utf8'));
 const file=fs.realpathSync(row.file),base=fs.realpathSync(sharedDir),rel=path.relative(base,file);
 if(!rel||rel.startsWith('..')||path.isAbsolute(rel))throw Error('Image is outside collected library');
 const b=fs.readFileSync(file);if(b.length>8*1024*1024||hash(b)!==id)throw Error('Collected image changed');
 return {...row,file};
}
export function sharedImageFile(file){
 const real=fs.realpathSync(file),id=path.basename(real).split('.')[0];
 const row=sharedImage(id);if(row.file!==real)throw Error('Collected image path mismatch');return real;
}
