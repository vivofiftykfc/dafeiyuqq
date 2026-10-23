import concurrent.futures, hashlib, subprocess, re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
url='https://download-r2.pytorch.org/whl/cu130/torch-2.11.0%2Bcu130-cp312-cp312-win_amd64.whl'
head=subprocess.check_output(['curl.exe','-s','-I','-L',url]).decode()
size=int(re.findall(r'content-length: (\d+)',head,re.I)[-1])
parts=ROOT/'wheel-parts'
parts.mkdir(exist_ok=True)
chunk=16*1024*1024
starts=list(range(0,size,chunk))
def fetch(start):
    count=min(chunk,size-start)
    dest=parts/str(start)
    if dest.exists() and dest.stat().st_size==count:return
    subprocess.run(['curl.exe','-f','-s','-S','-L','--retry','4','--retry-all-errors','--max-time','300','--range',f'{start}-{start+count-1}','-o',str(dest),url+f'?part={start}'],check=True)
    if dest.stat().st_size!=count:raise RuntimeError('Invalid chunk')
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for i,_ in enumerate(pool.map(fetch,starts)):
        if i%8==0:print('CUDA wheel',i+1,'/',len(starts),flush=True)
dest=ROOT/'wheels'/'torch-2.11.0+cu130-cp312-cp312-win_amd64.whl'
with dest.open('wb') as out:
    for start in starts:out.write((parts/str(start)).read_bytes())
assert hashlib.file_digest(dest.open('rb'),'sha256').hexdigest()=='ef8beae16d781c3244ef28dc7bee6d8871c26bbde65d5bf66e902cb61972c4ab'
print('CUDA WHEEL VERIFIED',flush=True)
