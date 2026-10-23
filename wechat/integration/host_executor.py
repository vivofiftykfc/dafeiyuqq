"""Fixed DSH entrypoint worker launched by the already authorized local bridge.

No network listener, arbitrary command endpoint, or automatic replay. Group and
evaluation generations stay on their existing non-owner execution path.
"""
import ctypes,hashlib,json,os,subprocess,sys,time,uuid
from pathlib import Path
from ctypes import wintypes
from privacy_policy import ROOT

QUEUE=ROOT/'runtime/host-executor'
HEALTH=ROOT/'runtime/host-executor-health.json'
SCRIPT=ROOT/'integration/host_executor.py'
PYTHON=ROOT/'runtime/MaiBot/.venv/Scripts/python.exe'

def enabled():
    from host_access import mode_for
    return mode_for(True)=='danger-full-access'

def admitted_file(value):
    file=Path(value).resolve(strict=True)
    if file.parent!=(ROOT/'runtime/dsh-requests').resolve() or file.suffix!='.json':raise ValueError('Unknown generation input')
    request=json.loads(file.read_text(encoding='utf-8'))
    job=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8')).get(request['job']['id'],{})
    cfg=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'))
    from dsh_policy import admitted
    from autonomy_policy import allowed
    if not enabled() or not admitted(job,cfg) or job.get('evaluation') or job.get('scope')!='private':raise ValueError('Not an owner computer task')
    if job.get('kind')!='chat' and not allowed(job):raise ValueError('Autonomous source changed')
    if job.get('dshDeadline',0)<=time.time()*1000:raise ValueError('Expired source')
    if file.stem!=hashlib.sha256(job['id'].encode()).hexdigest():raise ValueError('Generation identity mismatch')
    return file

def write_json(path,data):
    temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8');temporary.replace(path)

def process_started(pid):
    kernel=ctypes.WinDLL('kernel32',use_last_error=True)
    kernel.OpenProcess.argtypes=[wintypes.DWORD,wintypes.BOOL,wintypes.DWORD];kernel.OpenProcess.restype=wintypes.HANDLE
    kernel.CloseHandle.argtypes=[wintypes.HANDLE]
    kernel.GetExitCodeProcess.argtypes=[wintypes.HANDLE,ctypes.POINTER(wintypes.DWORD)]
    kernel.GetProcessTimes.argtypes=[wintypes.HANDLE,*([ctypes.POINTER(wintypes.FILETIME)]*4)]
    handle=kernel.OpenProcess(0x1000,False,pid)
    if not handle:raise OSError('Cannot inspect host worker')
    try:
        code=wintypes.DWORD();times=[wintypes.FILETIME() for _ in range(4)]
        if not kernel.GetExitCodeProcess(handle,ctypes.byref(code)) or code.value!=259:raise OSError('Host worker not running')
        if not kernel.GetProcessTimes(handle,*[ctypes.byref(x) for x in times]):raise OSError('Cannot verify process start')
        return ((times[0].dwHighDateTime<<32)+times[0].dwLowDateTime)/10000000-11644473600
    finally:kernel.CloseHandle(handle)

def live():
    try:
        state=json.loads(HEALTH.read_text(encoding='utf-8'))
        return abs(process_started(state['pid'])-state['created'])<.01
    except (OSError,ValueError,KeyError):return False

def ensure():
    if not enabled() or live():return
    # Only the existing privileged local service launches this worker. A Codex
    # child may inherit an OS-restricted token even when DSH says full access.
    if not ctypes.windll.shell32.IsUserAnAdmin():return
    QUEUE.mkdir(parents=True,exist_ok=True)
    with (ROOT/'runtime/host-executor.log').open('ab') as output:
        subprocess.Popen([str(PYTHON),'-X','utf8',str(SCRIPT),'--serve'],cwd=ROOT,stdout=output,stderr=output,creationflags=subprocess.CREATE_NO_WINDOW)

def submit(kind,file=None):
    if not enabled() or not live():raise RuntimeError('Host executor not ready; no restricted fallback')
    if kind=='generate':file=admitted_file(file)
    elif kind!='probe':raise ValueError('Unknown fixed host operation')
    identity=hashlib.sha256(str(file).encode()).hexdigest() if kind=='generate' else uuid.uuid4().hex
    request=QUEUE/(identity+'.request.json');claimed=QUEUE/(identity+'.claimed.json');result=QUEUE/(identity+'.result.json')
    if any(p.exists() for p in (request,claimed,result)):raise RuntimeError('Host operation already submitted; do not replay')
    write_json(request,{'kind':kind,'file':str(file) if file else None,'created':time.time()})
    deadline=time.monotonic()+130
    while time.monotonic()<deadline:
        if result.exists():
            reply=json.loads(result.read_text(encoding='utf-8'))
            if not reply.get('ok'):raise RuntimeError(reply.get('error','Host operation unconfirmed'))
            return json.loads(reply['stdout'])
        time.sleep(.2)
    raise TimeoutError('Host result unknown; never resubmit automatically')

def serve():
    if not ctypes.windll.shell32.IsUserAnAdmin():raise RuntimeError('Host worker must inherit the authorized service token')
    kernel=ctypes.WinDLL('kernel32',use_last_error=True);kernel.CreateMutexW.restype=ctypes.c_void_p
    mutex=kernel.CreateMutexW(None,False,'Local\\DafeiyuHostExecutor')
    if not mutex or ctypes.get_last_error()==183:return
    QUEUE.mkdir(parents=True,exist_ok=True)
    for path in QUEUE.glob('*.claimed.json'):
        result=path.with_name(path.name.replace('.claimed.json','.result.json'))
        if not result.exists():write_json(result,{'ok':False,'error':'Interrupted host operation; result unknown, no replay'})
    while enabled() and not (ROOT/'runtime/host-executor.stop').exists():
        write_json(HEALTH,{'pid':os.getpid(),'created':process_started(os.getpid()),'time':time.time(),'windows_elevated':True,'mode':'danger-full-access'})
        for path in list(QUEUE.glob('*.request.json'))[:1]:
            claimed=path.with_name(path.name.replace('.request.json','.claimed.json'));path.replace(claimed)
            result=path.with_name(path.name.replace('.request.json','.result.json'))
            proc=None
            try:
                req=json.loads(claimed.read_text(encoding='utf-8'))
                if not 0<=time.time()-req['created']<=130:raise ValueError('Stale host request')
                if req['kind']=='generate':args=[str(ROOT/'integration/dsh_generate.py'),str(admitted_file(req['file']))]
                elif req['kind']=='probe':args=[str(ROOT/'integration/probe_host_access.py')]
                else:raise ValueError('Unknown operation')
                proc=subprocess.Popen([str(PYTHON),'-X','utf8',*args],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,creationflags=subprocess.CREATE_NO_WINDOW)
                out,err=proc.communicate(timeout=120)
                if proc.returncode or len(out)>512000:raise RuntimeError('Host child failed; no automatic retry')
                json.loads(out)
                reply={'ok':True,'stdout':out.decode('utf-8'),'time':time.time()}
            except Exception as error:
                if proc and proc.poll() is None:
                    subprocess.run(['taskkill','/PID',str(proc.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW);proc.communicate()
                reply={'ok':False,'error':type(error).__name__+': '+str(error),'time':time.time()}
            write_json(result,reply)
        time.sleep(.5)

if __name__=='__main__':
    if sys.argv[1]=='--serve':serve()
    elif sys.argv[1]=='--ensure':ensure()
    elif sys.argv[1]=='--probe':print(json.dumps(submit('probe'),ensure_ascii=False))
