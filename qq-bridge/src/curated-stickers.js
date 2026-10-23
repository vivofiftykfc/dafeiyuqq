import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {safeFetchBuffer} from './safe-fetch.js';
const packDir=path.resolve(import.meta.dirname,'../../assets/whale-gifs');
export async function fetchStickerBuffer(entry,maxBytes) {
  const manifest=path.join(packDir,'pack.json');
  if(entry.source==='manual' && fs.existsSync(manifest)) {
    const rows=JSON.parse(fs.readFileSync(manifest,'utf8'));
    const row=rows.find(r=>r.id===entry.id && r.url===entry.url);
    if(row) {
      const base=fs.realpathSync(packDir);
      const file=fs.realpathSync(row.localFile);
      const rel=path.relative(base,file);
      if(rel.startsWith('..')||path.isAbsolute(rel))throw new Error('Sticker path outside curated pack');
      if(fs.statSync(file).size>maxBytes)throw new Error('Sticker size limit exceeded');
      const buffer=fs.readFileSync(file);
      if(!/^GIF8[79]a$/.test(buffer.subarray(0,6).toString()))throw new Error('Invalid curated GIF');
      if(crypto.createHash('sha256').update(buffer).digest('hex')!==row.sha256)throw new Error('Curated sticker hash mismatch');
      return {buffer};
    }
  }
  return safeFetchBuffer(entry.url,maxBytes);
}
