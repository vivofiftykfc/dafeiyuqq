"""Write bounded SILK payloads using the owned D-drive voice interpreter.

The C-drive bridge interpreter cannot write this protected folder on this PC.
No user-selected paths, shell commands or network access are involved.
"""
import hashlib,json,subprocess,sys
from pathlib import Path
from voice_paths import VOICE_ROOT,audio_dir

def validate(raw):
    if not isinstance(raw,bytes) or not 0<len(raw)<=8*1024*1024 or not raw[:16].lstrip(b'\x02').startswith(b'#!SILK_V3'):
        raise ValueError('Invalid bounded SILK payload')
    return hashlib.sha256(raw).hexdigest()

def store(raw,scope='private'):
    digest=validate(raw);folder=audio_dir(scope);dest=folder/(digest+'.silk')
    # Exclusive creation makes a partial/changed existing file fail rather than
    # silently replacing audio tied to an already claimed incoming message.
    try:
        with dest.open('xb') as stream:stream.write(raw)
    except FileExistsError:
        if dest.read_bytes()!=raw:raise ValueError('Voice file conflict')
    if hashlib.sha256(dest.read_bytes()).hexdigest()!=digest:raise ValueError('Voice write verification failed')
    return {'path':str(dest),'sha256':digest,'bytes':len(raw)}

def store_from_bridge(raw,scope='private'):
    if scope not in ('private','group') and not __import__('re').fullmatch(r'contacts/[0-9a-f]{64}',scope):raise ValueError('Unknown voice scope')
    digest=validate(raw)
    result=subprocess.run([str(VOICE_ROOT/'venv/Scripts/python.exe'),'-X','utf8',str(Path(__file__).resolve()),scope],
        input=raw,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=10,creationflags=0x08000000)
    if result.returncode or len(result.stdout)>4096:raise RuntimeError('Owned voice storage worker failed')
    value=json.loads(result.stdout.decode('utf-8'))
    expected=(VOICE_ROOT/'audio'/scope/(digest+'.silk')).resolve()
    if value.get('sha256')!=digest or value.get('bytes')!=len(raw) or Path(value.get('path','')).resolve()!=expected:
        raise ValueError('Voice storage response mismatch')
    if hashlib.sha256(expected.read_bytes()).hexdigest()!=digest:raise ValueError('Stored voice content changed')
    return value

if __name__=='__main__':
    raw=sys.stdin.buffer.read(8*1024*1024+1)
    print(json.dumps(store(raw,sys.argv[1] if len(sys.argv)>1 else 'private'),ensure_ascii=False))
