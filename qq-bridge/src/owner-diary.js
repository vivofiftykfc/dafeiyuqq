import fs from 'node:fs';
import path from 'node:path';
import {Diary} from '../../tutorial-kit/packages/companion/src/diary.js';
import {DATA,guard} from './owner-services.js';
const dir=path.join(DATA,'diary');
const desktop=JSON.parse(fs.readFileSync(path.join(DATA,'diary-settings.json'),'utf8')).desktopDirectory;
const book=()=>new Diary({dir,maxChars:2000});
export function diaryRead({day,limit=5}={}){guard();const d=book();return {directory:dir,stats:d.stats(),entries:day?d.day(day):d.recent(Math.min(20,Math.max(1,limit)))};}
export function diaryWrite({text,title='',mood='',tags=[],basis}){
 guard();const d=book();const clean=text.trim();
 if(!basis?.trim())throw Error('State the actual experience or thought this entry is based on');
 const past=d.recent(100);if(past.some(e=>e.text===clean))return {unchanged:true,entry:past.find(e=>e.text===clean)};
 const now=new Date();const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 const day=`${parts.year}-${parts.month}-${parts.day}`;
 if(past.filter(e=>e.day===day).length>=8)throw Error('Enough diary entries today; read and reflect instead of adding duplicates');
 const entry=d.add({text:clean,title,mood,tags,day,time:parts.hour+':'+parts.minute});
 fs.appendFileSync(path.join(dir,'evidence.jsonl'),JSON.stringify({t:entry.t,day,basis})+'\n');
 let desktopError;
 try{fs.mkdirSync(desktop,{recursive:true});fs.copyFileSync(path.join(dir,day+'.md'),path.join(desktop,day+'.md'));}catch(e){desktopError=e.message;}
 return {entry,file:path.join(dir,day+'.md'),desktopFile:desktopError?undefined:path.join(desktop,day+'.md'),desktopError,private:true};
}
