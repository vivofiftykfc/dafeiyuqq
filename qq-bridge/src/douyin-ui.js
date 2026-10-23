export const FRIENDS=Object.freeze(['泰子椰','李骥','Laisser tomber','example_friend','SAM']);
export const ACCOUNT='11000004';
export const PKG='com.ss.android.ugc.aweme';
const decode=s=>s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,x)=>x[0]==='#'?String.fromCodePoint(x[1].toLowerCase()==='x'?parseInt(x.slice(2),16):Number(x.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[x]));
export function parseUI(xml) {
  if(!xml.includes('</hierarchy>'))throw Error('手机界面 XML 不完整');
  const root={children:[]},stack=[root],nodes=[];
  for(const m of xml.matchAll(/<node\b([^>]*?)(\/?)>|<\/node>/g)) {
    if(m[0]==='</node>'){if(stack.length<2)throw Error('手机界面 XML 错误');stack.pop();continue;}
    const n={children:[],parent:stack.at(-1)};
    for(const a of m[1].matchAll(/([\w-]+)="([^"]*)"/g))n[a[1]]=decode(a[2]);
    n.b=(n.bounds?.match(/\d+/g)||[]).map(Number);n.parent.children.push(n);nodes.push(n);if(!m[2])stack.push(n);
  }
  if(stack.length!==1)throw Error('手机界面 XML 未闭合');
  return nodes;
}
export const byId=(n,id)=>n.filter(x=>x['resource-id']===PKG+':id/'+id);
export const label=n=>n.text||n['content-desc']||'';
export function box(n){while(n&&(!(n.b?.[2]>n.b?.[0])||!(n.b?.[3]>n.b?.[1])))n=n.parent;return n;}
export function descendants(n){return [n,...n.children.flatMap(descendants)];}
export function title(nodes){const v=byId(nodes,'vws');return v.length===1?label(v[0]):'';}
export function chatSnapshot(nodes,friend) {
  if(!FRIENDS.includes(friend)||title(nodes)!==friend||byId(nodes,'msg_et').length!==1)throw Error('不是指定好友的私聊：'+friend);
  const container=byId(nodes,'v6m').at(-1);
  if(!container)throw Error('无法识别私聊消息列表');
  const rows=[];
  const width=container.b[2]-container.b[0];
  for(const body of byId(descendants(container),'m6m')) {
    const row=body.parent,all=descendants(row),avatars=byId(all,'dxx');
    if(avatars.length>1)throw Error('消息方向不明确');
    // Bubble widths vary; the full message body has a stable avatar gutter.
    // Consecutive bubbles omit their avatar, so use that gutter in those rows.
    const gutter=body.b[0]>width*.12&&body.b[2]>width*.94?'in':body.b[0]<width*.08&&body.b[2]<width*.88?'out':null;
    const avatar=avatars[0];
    const direction=avatar?(avatar.b[0]>width*.7?'out':avatar.b[2]<width*.2?'in':null):gutter;
    if(!direction||(gutter&&direction!==gutter))throw Error('无法确定消息发送方');
    const bubbles=byId(all,'swa');
    const text=bubbles.map(b=>b['content-desc']||b.text||descendants(b).filter(x=>x!==b&&x.text).map(x=>x.text).join('')).join('\n');
    rows.push({direction,text:text||'[非文字消息]',kind:text?'text':'media'});
  }
  return {friend,messages:rows};
}
export const signature=m=>JSON.stringify([m.direction,m.kind,m.text]);
// Largest suffix/prefix overlap. Loss of overlap is never permission to replay history.
export function newMessages(previous,current) {
  if(!previous)return {baseline:true,messages:[]};
  const a=previous.map(signature),b=current.map(signature);
  if(!a.length)return b.length?{baseline:true,messages:[]}:{messages:[]};
  for(let k=Math.min(a.length,b.length);k>0;k--)if(a.slice(-k).every((v,i)=>v===b[i]))return {messages:current.slice(k)};
  return {baseline:true,messages:[]};
}
