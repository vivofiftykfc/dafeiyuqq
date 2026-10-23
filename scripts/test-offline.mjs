import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const tests=['test-chat-memory.mjs','test-continuity.mjs','test-owner-memory.mjs','test-conversation-input.mjs','test-qq-dns.mjs'];
let failed=0;
for(const test of tests){const p=path.join(root,'qq-bridge/scripts',test);const r=spawnSync(process.execPath,[p],{cwd:path.join(root,'qq-bridge'),stdio:'inherit',env:{...process.env,QQ_BRIDGE_TEST_LIVE:'0'}});if(r.status!==0)failed++;}
console.log(`${tests.length-failed}/${tests.length} offline suites passed.`);process.exitCode=failed?1:0;
