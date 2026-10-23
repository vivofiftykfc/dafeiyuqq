import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {conversationView,stampUserTurn} from './tavern-extension/history-view.mjs';
import {deliveryPlan,packageReply} from './tavern-extension/reply-delivery.mjs';
const source=[
 {is_user:true,mes:'[桥接补充：旧日志]\n[{"text":"画图旧任务"}]\n[当前消息]\n今天开心'},
 {is_user:false,mes:'我这边的桥接还在处理旧任务'},
 {is_user:true,mes:'我很喜欢那只胖猫'},
 {is_user:false,mes:'像一块会呼吸的门垫'},
 {is_user:true,mes:'/角色 另一个角色'},
 {is_user:false,mes:'已切换'}
];
const saved=JSON.stringify(source),view=conversationView(source);
assert.equal(JSON.stringify(source),saved,'source history must remain untouched');
const imageHistory=[
 {is_user:true,mes:'[图片]',extra:{dafeiyu_visual_event:'first'}},
 {is_user:false,mes:'这表情像我端白饭的时候'},
 {is_user:false,is_system:true,mes:'[实际发出的表情]'},
 {is_user:true,mes:'我喜欢这个颜色'},
 {is_user:false,mes:'我也喜欢蓝色'},
 {is_user:true,mes:'[图片]',extra:{dafeiyu_visual_event:'second'}},
 {is_user:false,mes:'又要抢白饭了'}
];
const imageSaved=JSON.stringify(imageHistory);
const fresh=conversationView(imageHistory,{visualEvent:'third',text:'[图片]'});
assert.equal(fresh.stats.retiredImageReplies,2);
assert.equal(fresh.messages.filter(x=>x.is_user).length,3);
assert(fresh.messages.some(x=>x.mes==='我也喜欢蓝色'));
assert(fresh.messages.some(x=>x.is_system));
assert(fresh.messages.some(x=>x.mes.includes('图片ID=first')));
assert.equal(JSON.stringify(imageHistory),imageSaved);
for(const text of ['和刚才那张比一下','为什么你刚才说白饭','这两张图有什么不同']){
 assert.equal(conversationView(imageHistory,{visualEvent:'third',text}).stats.retiredImageReplies,0);
}
const same=conversationView(imageHistory,{visualEvent:'second',text:'[图片]'});
assert(same.messages.some(x=>x.mes==='又要抢白饭了'),'same-image context remains available');
const ask=[{is_user:true,mes:'[图片]'},{is_user:false,mes:'你把截图发来看看'}];
assert.equal(conversationView(ask,{visualEvent:'new',text:'[图片]'}).stats.retiredImageReplies,0);
const turn={is_user:true,mes:'[图片]'};stampUserTurn(turn,{id:'wechat:test',text:'[图片]',visualEvent:'image-exact'});
assert.equal(turn.extra.dafeiyu_visual_event,'image-exact');assert.equal(turn.mes,'[图片]');
assert.throws(()=>stampUserTurn(turn,{id:'wrong',text:'other'}));
const referenceTurn={is_user:true,mes:'这张图是什么？'};
stampUserTurn(referenceTurn,{id:'wechat:reference',text:referenceTurn.mes,visualEvent:'image-exact'});
assert.equal(referenceTurn.extra.dafeiyu_visual_event,undefined);
assert.equal(referenceTurn.extra.dafeiyu_visual_reference,'image-exact');
const members=[{is_user:true,name:'群友甲',mes:'你主人有没有找你做坏事'},
 {is_user:false,mes:'没有呀'},
 {is_user:true,name:'群友乙',mes:'[图片]'}];
const memberView=conversationView(members,{scope:'group',visualEvent:'new',text:'[图片]'});
assert(memberView.messages[0].mes.startsWith('[本条群聊发言者：群友甲]'));
assert(memberView.messages[2].mes.startsWith('[本条群聊发言者：群友乙]'));
assert.equal(members[2].mes,'[图片]');
assert.equal(conversationView(members,{scope:'private'}).messages[0].mes,members[0].mes);
assert.deepEqual(view.messages.map(x=>x.mes),['今天开心','我很喜欢那只胖猫','像一块会呼吸的门垫']);
const plan=deliveryPlan({mode:'comfort',max_chars:260,bubble_count:2,followup:true});
assert.deepEqual(packageReply('先靠过来一点<WECHAT_BUBBLE>想说的时候我听着',plan).bubbles,['先靠过来一点','想说的时候我听着']);
assert.equal(packageReply('一句完整的话',plan).bubbles.length,1,'do not force extra bubbles');
assert.deepEqual(packageReply('第一句</WECHAT_BUBBLE><WECHAT_BUBBLE>第二句</WECHAT_BUBBLE>',plan).bubbles,['第一句','第二句']);
assert.equal(packageReply('第一句<WECHAT_BUBBLE>第二句',{...plan,bubble_count:1}).bubbles.length,1);
assert.equal(deliveryPlan({mode:'task',max_chars:99999,bubble_count:99}).bubble_count,1);
assert.equal(deliveryPlan({mode:'unknown',max_chars:80}),null);
assert.equal(deliveryPlan({mode:'play',target_chars:45}).mode,'play');
assert.deepEqual(deliveryPlan({mode:'comfort',target_chars:200,grounding_quotes:['朋友转述给我','所有人都讨厌我']},['后来是朋友转述给我的']).grounding_quotes,['朋友转述给我']);
const cfg=JSON.parse(fs.readFileSync('local/tavern.json','utf8')),role=cfg.roles.private;
const file=`__TAVERN_ROOT__/data/default-user/chats/${role.avatar.replace(/\.png$/,'')}/${role.chatFile}.jsonl`;
const raw=fs.readFileSync(file),hash=crypto.createHash('sha256').update(raw).digest('hex');
const rows=raw.toString('utf8').split('\n').filter(Boolean).map(x=>JSON.parse(x));
const cleaned=conversationView(rows.slice(1));
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash);
fs.writeFileSync('runtime/conversation-view-acceptance.json',JSON.stringify({source:file,source_sha256:hash,source_unchanged:true,raw_turns:rows.length-1,view_turns:cleaned.messages.length,changes:cleaned.stats},null,2));
console.log('History preservation, legacy cleanup and adaptive bubble packaging checks passed',cleaned.stats);
