import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const modes = new Set(['inherit','off','chat','reserved2','closed-agent']);
export class SessionPolicies {
  constructor(file) {
    this.file=file; this.data={version:1,entries:{}};
    if(fs.existsSync(file)) this.data=JSON.parse(fs.readFileSync(file,'utf8'));
    if(this.data.version!==1 || !this.data.entries || Array.isArray(this.data.entries)) throw Error('会话策略文件格式错误');
  }
  resolve(key,{mode,ownerQQ,role=null}) {
    const row=this.data.entries[key]||{};
    const owner=key===`private:${ownerQQ}`;
    const selected=row.mode && row.mode!=='inherit'?row.mode:mode;
    return {key,mode:selected,role:row.role===undefined?role:row.role,owner,
      relationship:owner?'owner':key.startsWith('group:')?'group':'friend',
      proactive:row.proactive??'inherit', revision:row.revision||0,
      permissions:owner&&['closed-agent','reserved2'].includes(selected)?'owner':'social',
      source:this.data.entries[key]?'override':'legacy'};
  }
  save(key,input,ownerQQ) {
    if(!/^(private|group):[1-9]\d*$/.test(key)) throw Error('需要准确的 private:QQ号 或 group:群号');
    if(!modes.has(input.mode)) throw Error('不支持的会话模式');
    if(input.mode==='closed-agent' && key!==`private:${ownerQQ}`) throw Error('工具任务模式仅允许主人私聊');
    if(!['inherit','off','reply','share'].includes(input.proactive)) throw Error('无效的主动程度');
    if(input.role!==undefined && input.role!==null && (typeof input.role!=='string'|| !input.role || /[\\/\x00-\x1f]/.test(input.role)||input.role.includes('..'))) throw Error('无效角色名');
    if(key===`private:${ownerQQ}` && ['closed-agent','reserved2'].includes(input.mode) && input.role!==undefined) throw Error('主人专属模式保留 identity.md，请使用继承角色');
    const old=this.data.entries[key];
    const row={mode:input.mode,proactive:input.proactive,revision:(old?.revision||0)+1,
      ...(input.role!==undefined?{role:input.role}:{}),previous:old?{mode:old.mode,proactive:old.proactive,...(old.role!==undefined?{role:old.role}:{})}:{mode:'inherit',proactive:'inherit'}};
    const next={version:1,entries:{...this.data.entries,[key]:row}};
    fs.mkdirSync(path.dirname(this.file),{recursive:true});
    fs.writeFileSync(this.file+'.tmp',JSON.stringify(next,null,2)); fs.renameSync(this.file+'.tmp',this.file);this.data=next;
    return row;
  }
  fingerprint(policy) {return createHash('sha256').update(JSON.stringify(policy)).digest('hex').slice(0,20);}
}
