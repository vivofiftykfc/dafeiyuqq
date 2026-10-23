import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const argv=process.argv.slice(2), opts={};
for(let i=0;i<argv.length;i+=2){if(!argv[i]?.startsWith('--')||!argv[i+1])throw Error('Use --option value pairs');opts[argv[i].slice(2)]=argv[i+1];}
if(!/^\d{5,12}$/.test(opts['owner-qq']||'')||!/^\d{5,12}$/.test(opts['bot-qq']||'')||opts['owner-qq']===opts['bot-qq'])throw Error('Provide different --owner-qq and --bot-qq account numbers. No services were started.');
const values={PROJECT_ROOT:root,DSH_ROOT:opts['dsh-root']||'D:/APPs/dsh/DeepSeek Harness',COMFY_ROOT:opts['comfy-root']||'D:/APPs/ComfyUI_windows_portable',VOICE_ROOT:opts['voice-root']||path.join(root,'services/voice'),TAVERN_ROOT:opts['tavern-root']||'D:/Projects/SillyTavern-Dafeiyu',DSH_HOME:path.join(os.homedir(),'.dsh'),WECHAT_CLIENT_ROOT:opts['wechat-client-root']||'D:/APPs/WeChat',WECHAT_DATA_ROOT:opts['wechat-data-root']||'D:/Archive/ChatData/WeChat/xwechat_files',FFMPEG_ROOT:opts['ffmpeg-root']||'D:/APPs/FFmpeg',PYTHON_ROOT:opts['python-root']||'D:/miniconda',USER_HOME:os.homedir()};
for(const v of Object.values(values))if(/[\r\n'"`$]/.test(v))throw Error('Installation paths must not contain quotes, newlines, backticks or dollar signs.');
const skip=new Set(['.git','node_modules','state','local','runtime','data','logs','models','audio','jobs','references','venv','.venv','__pycache__']);
let count=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(e.name)||e.isSymbolicLink())continue;const p=path.join(dir,e.name);if(e.isDirectory()){walk(p);continue;}if(p===import.meta.filename||! /\.(m?js|cjs|ts|py|ps1|cmd|bat|html|json|ya?ml|toml|txt|md)$/.test(p))continue;let t=fs.readFileSync(p,'utf8'),next=t;for(const [key,value] of Object.entries(values)){const v=p.endsWith('.ps1')||p.endsWith('.cmd')||p.endsWith('.bat')?value.replaceAll('/','\\'):value.replaceAll('\\','/');next=next.split('__'+key+'__').join(v);}next=next.split('10000001').join(opts['owner-qq']).split('10000002').join(opts['bot-qq']);if(next!==t){fs.writeFileSync(p,next);count++;}}}
const configFile=path.join(root,'qq-bridge/config.json');
if(fs.existsSync(configFile))throw Error('config.json already exists. Back it up and review it before reconfiguring; this command will not overwrite it.');
walk(root);
function seed(relative,data){const p=path.join(root,relative);if(fs.existsSync(p))return;fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof data==='string'?data:JSON.stringify(data,null,2));}
const cfg=JSON.parse(fs.readFileSync(path.join(root,'qq-bridge/config.example.json'),'utf8'));
Object.assign(cfg,{ownerQQ:opts['owner-qq'],botQQ:opts['bot-qq'],sessionCwd:path.join(root,'workspace'),agentPreset:'qq-chat',allow:{private:[opts['owner-qq']],groups:[]},allowAllWhenEmpty:false,consoleToken:crypto.randomBytes(24).toString('base64url')});
Object.assign(cfg.dsh,{baseUrl:'http://127.0.0.1:18031',provider:'deepseek-account',model:'deepseek-flash',reasoningEffort:'high'});
cfg.snowluma.homeDir=path.join(root,'snowluma');
seed('qq-bridge/config.json',cfg);
seed('local/dependencies.local.json',values);
seed('qq-bridge/state/mode.json',{mode:'chat'});
seed('qq-bridge/state/owner/identity.md','# 基础人格\n\n这里写你自己的角色设定。不要将账号密码写入人格。\n');
seed('qq-bridge/state/owner/memory.json',{facts:[]});
seed('qq-bridge/state/owner/diary-settings.json',{desktopDirectory:path.join(root,'local/diary-desktop')});
seed('qq-bridge/state/owner/self-development.json',{revision:0,preferences:[],viewpoints:[],expression:[]});
seed('qq-bridge/config/owner-identities.json',{qq:{botAccount:opts['bot-qq'],privatePeer:'private:'+opts['owner-qq']}});
fs.mkdirSync(path.join(root,'workspace'),{recursive:true});
console.log(`Configured ${count} source files. Personal files are ignored by Git. Next: set the SnowLuma HTTP token in qq-bridge/config.json, install the dafeiyuqq DSH profile, then run npm run doctor.`);
