import fs from 'node:fs';
export function conversationPolicy(){return fs.readFileSync(new URL('../config/conversation-policy.txt',import.meta.url),'utf8');}
