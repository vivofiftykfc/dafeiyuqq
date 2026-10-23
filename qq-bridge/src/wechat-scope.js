import crypto from 'node:crypto';
export function mediaScope(peer){
  if(peer==='wxid_owner')return 'private';
  if(peer==='10000000@chatroom')return 'group';
  if(!/^wxid_[A-Za-z0-9_-]{3,80}$/.test(peer))throw Error('Invalid media peer');
  return 'contacts/'+crypto.createHash('sha256').update(peer).digest('hex');
}
