import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
const db=new DatabaseSync(new URL('../state/chat-memory.sqlite',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'),{readOnly:true});
const rows=db.prepare('SELECT m.*,c.platform,c.peer FROM messages m JOIN chats c USING(k) ORDER BY m.id').all();
const stats={};for(const r of rows){const type=r.event.startsWith('legacy:')?'imported':'recorded',key=[r.platform,type,r.role].join('/');stats[key]=(stats[key]||0)+1;}
const actual=rows.filter(r=>r.role==='out'&&!r.event.startsWith('legacy:'));
const patterns=Object.fromEntries(['没点开','视频单','菜单','哥哥','哥，','你觉得呢'].map(p=>[p,actual.filter(r=>r.text.includes(p)).map(r=>r.id)]));
console.log(JSON.stringify({total:rows.length,stats,patterns}));
console.log(JSON.stringify(rows.filter(r=>r.platform==='wechat'&&r.peer.endsWith('@chatroom')).slice(0,30).map(({id,role,text})=>({id,role,text}))));
fs.writeFileSync(new URL('../../logs/dialogue-quality-counts.json',import.meta.url),JSON.stringify({total:rows.length,stats,patterns},null,2));db.close();
