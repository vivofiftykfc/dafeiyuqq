import fs from 'node:fs';
const target='__PROJECT_ROOT__/wechat/runtime/dsh-home/profiles/dafeiyu-wechat/node_modules/dsh-wechat/dist/bridge/bridge.js';
let text=fs.readFileSync(target,'utf8');
if(text.includes('wechat-chat-memory.js')){console.log('WeChat memory adapter already installed');process.exit(0);}
const replace=(from,to)=>{if(!text.includes(from))throw Error('WeChat plugin layout changed; no files modified');text=text.replace(from,to);};
replace('    promptBlocksFor(msg) {','    promptBlocksFor(msg) {\n        wechatRemember(this.token?.accountId, msg.from_user_id, "in", (msg.item_list||[]).map(i=>i.text_item?.text || (i.voice_item?.text ? "[语音转写]"+i.voice_item.text : "[媒体]")).join("\\n"), msg.message_id ? "in:"+msg.message_id : undefined);');
replace('    async forwardBlocksToAgent(user, blocks, ensured) {','    async forwardBlocksToAgent(user, blocks, ensured) {\n        const recalled=wechatContext(this.token?.accountId,user.userId);\n        if(recalled)blocks=[{type:"text",text:recalled},...blocks];');
replace('                    contextToken,\n                });\n            }\n            else {','                    contextToken,\n                });\n                wechatRemember(token.accountId,userId,"out",payload);\n            }\n            else {');
replace('                        contextToken: this.wireContextToken ?? undefined,\n                    });\n                }','                        contextToken: this.wireContextToken ?? undefined,\n                    });\n                    wechatRemember(token.accountId,userId,"out",msg.text);\n                }');
text='import {wechatRemember,wechatContext} from "file:///__PROJECT_ROOT__/qq-bridge/src/wechat-chat-memory.js";\n'+text;
fs.copyFileSync(target,target+'.before-chat-memory');fs.writeFileSync(target,text);
console.log('Installed WeChat iLink memory adapter; backup retained; plugin restart required');
