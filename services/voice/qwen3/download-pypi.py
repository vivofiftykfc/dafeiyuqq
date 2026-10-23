import concurrent.futures, hashlib, json, subprocess, sys, urllib.request
from pathlib import Path
root=Path(__file__).resolve().parent/'wheels'
package,version=sys.argv[1:3]
m=json.load(urllib.request.urlopen(f'https://pypi.org/pypi/{package}/{version}/json'))
f=next(x for x in m['urls'] if x['filename'].endswith('.whl') and ('cp312-cp312-win_amd64' in x['filename'] or 'py3-none-any' in x['filename']))
size=f['size']; chunk=16*1024*1024
starts=list(range(0,size,chunk))
dest=root/f['filename']
def fetch(start):
    part=root/(f['filename']+'.part-'+str(start))
    count=min(chunk,size-start)
    if not part.exists() or part.stat().st_size!=count:
        subprocess.run(['curl.exe','-fsSL','--retry','4','--retry-all-errors','--max-time','180','--range',f'{start}-{start+count-1}','-o',str(part),f['url']+f'?part={start}'],check=True)
    return part
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex: parts=list(ex.map(fetch,starts))
with dest.open('wb') as out:
    for part in parts:out.write(part.read_bytes())
assert hashlib.file_digest(dest.open('rb'),'sha256').hexdigest()==f['digests']['sha256']
print(package,'wheel verified',flush=True)
