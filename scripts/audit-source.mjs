import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const issues=[];
const pathRule=/(^|\/)(node_modules|state|local|runtime|data|logs|models|references|sessions|\.venv|venv)(\/|$)|(^|\/)config\.json$|\.(sqlite(?:-wal|-shm)?|db|jsonl|exe|dll|gguf|safetensors|wav|mp3|lnk)$/i;
const rules=[['GitHub credential',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],['private key material',/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----(?:\r?\n|\\n)[A-Za-z0-9+/=]{48,}/],['JWT credential',/\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/]];
for(const name of files){const sdkModule=/^tools\/douyin-im\/(?:src|lib)\/base\/runtime\/[A-Za-z0-9_./-]+\.(?:ts|js)(?:\.map)?$/.test(name);if(pathRule.test(name)&&!sdkModule)issues.push({file:name,reason:'private or binary path'});const p=path.join(root,name);if(!fs.existsSync(p))continue;const stat=fs.statSync(p);if(stat.size>10*1024*1024)issues.push({file:name,reason:'unexpected large source file'});if(stat.size<10*1024*1024){const t=fs.readFileSync(p,'utf8');for(const [reason,re]of rules)if(re.test(t))issues.push({file:name,reason});}}
for(const issue of issues)console.error(`${issue.file}: ${issue.reason}`);
console.log(`${files.length} tracked source files inspected; ${issues.length} findings. This check does not replace a manual review.`);process.exitCode=issues.length?1:0;
