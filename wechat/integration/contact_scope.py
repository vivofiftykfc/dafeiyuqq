"""Extra friends get conversation media, never owner capabilities."""
import hashlib,sys
from pathlib import Path
from privacy_policy import PRIVATE_PEER,GROUP_PEER
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'qq-bridge/scripts'))
from wechat_allowlist import allowed

def media_scope(peer,sender=None):
    if peer==GROUP_PEER:return 'group'
    if sender is not None and sender!=peer:raise ValueError('Private sender mismatch')
    if peer==PRIVATE_PEER:return 'private'
    if not allowed(peer):raise ValueError('Contact is not enabled')
    return 'contacts/'+hashlib.sha256(peer.encode()).hexdigest()
