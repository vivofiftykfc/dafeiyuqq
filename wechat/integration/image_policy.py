"""Only public reviewed assets or images from the destination's own scope."""
import hashlib,json
from pathlib import Path
from privacy_policy import ROOT,PRIVATE_PEER,GROUP_PEER

def approved_image(target,path):
    if target not in (PRIVATE_PEER,GROUP_PEER):raise ValueError('Unknown destination')
    p=Path(path).resolve(strict=True)
    if not p.is_file() or not 0<p.stat().st_size<=16*1024*1024:raise ValueError('Invalid image size')
    raw=p.read_bytes()
    if not (raw.startswith(b'\x89PNG\r\n\x1a\n') or raw.startswith(b'\xff\xd8\xff') or raw.startswith((b'GIF87a',b'GIF89a')) or (raw.startswith(b'RIFF') and raw[8:12]==b'WEBP')):
        raise ValueError('Unsupported image signature')
    entries=json.loads((ROOT/'assets/memes/catalog.json').read_text(encoding='utf-8'))['items']
    for item in entries:
        if item.get('reviewed') and p==(ROOT/item['path']).resolve():
            if hashlib.sha256(raw).hexdigest()!=item['sha256']:raise ValueError('Public image changed')
            return p
    scope='private' if target==PRIVATE_PEER else 'group'
    from meme_library import approved
    if approved(target,p):return p
    folder=(ROOT/'runtime/media'/scope/'generated').resolve()
    if not p.is_relative_to(folder):raise ValueError('Cross-conversation image rejected')
    return p
