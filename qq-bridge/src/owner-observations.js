import fs from 'node:fs';
import path from 'node:path';
import {DATA,guard} from './owner-services.js';
const file=path.join(DATA,'observations.jsonl');
export function read(limit=10){guard();return fs.existsSync(file)?fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).slice(-limit).map(JSON.parse):[];}
export function record(entry){guard();const row={at:new Date().toISOString(),...entry};fs.appendFileSync(file,JSON.stringify(row)+'\n');return {saved:true,file,entry:row};}
