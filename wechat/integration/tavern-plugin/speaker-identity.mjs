/* Attribution only. These values never authorize tools or account access. */
import crypto from 'node:crypto';
const owner='wxid_owner',group='10000000@chatroom';
export function speakerIdentity(scope,senderId,display,evaluation=false){
 if(senderId===null||senderId===undefined)return null;
 if(typeof senderId!=='string'||!/^wxid_[A-Za-z0-9_]{1,100}$/.test(senderId))throw Error('Invalid native sender ID');
 if(!['private','group'].includes(scope))throw Error('Invalid identity scope');
 if(scope==='private'&&!evaluation&&senderId!==owner)throw Error('Private sender does not match bound owner');
 return {stable_id:senderId,display_name:String(display||'').replace(/[\r\n\u0000-\u001f]/g,' ').slice(0,100),
  code:scope==='group'?'member-'+crypto.createHash('sha256').update(group+senderId).digest('hex').slice(0,12):'bound-owner',
  source:evaluation?'evaluation_fixture':'bridge_native_sender'};
}
