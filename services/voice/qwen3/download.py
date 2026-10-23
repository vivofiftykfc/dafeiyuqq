import concurrent.futures, hashlib, json, subprocess, time
from pathlib import Path
ROOT=Path(__file__).resolve().parent
manifest=json.loads((ROOT/'download-manifest.json').read_text())
CHUNK=16*1024*1024
def fetch(url, dest, size, start=None):
    if dest.exists() and dest.stat().st_size==size: return
    args=['curl.exe','--fail','--silent','--show-error','-L','--retry','4','--connect-timeout','20','--max-time','300']
    if start is not None: args+=['--range',f'{start}-{start+size-1}']
    args+=['-o',str(dest),url+f'?part={start or 0}']
    for attempt in range(3):
        p=subprocess.run(args,capture_output=True)
        if p.returncode==0 and dest.exists() and dest.stat().st_size==size:return
    raise RuntimeError(f'Download failed: {dest.name}: {p.stderr[-200:]!r}')
for name, spec in manifest.items():
    for item in spec['files']:
        dest=ROOT/'models'/name/item['name']
        dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.exists() and dest.stat().st_size==item['size']:
            if not item['sha256'] or hashlib.file_digest(dest.open('rb'),'sha256').hexdigest()==item['sha256']: continue
        url=f"https://huggingface.co/Qwen/{name}/resolve/{spec['revision']}/{item['name']}"
        if item['size']<CHUNK: fetch(url,dest,item['size'])
        else:
            pieces=ROOT/'parts'/name/item['name'].replace('/','_')
            pieces.mkdir(parents=True,exist_ok=True)
            starts=list(range(0,item['size'],CHUNK))
            def part(start):
                fetch(url,pieces/str(start),min(CHUNK,item['size']-start),start)
                return start
            with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
                for i,_ in enumerate(pool.map(part,starts)):
                    if i%8==0:print(name,item['name'],f'{i+1}/{len(starts)} chunks',flush=True)
            with dest.open('wb') as out:
                for start in starts:
                    out.write((pieces/str(start)).read_bytes())
        if item['sha256'] and hashlib.file_digest(dest.open('rb'),'sha256').hexdigest()!=item['sha256']:raise RuntimeError('SHA256 mismatch: '+str(dest))
        print('Verified',name,item['name'],flush=True)
print('ALL MODELS VERIFIED',flush=True)
