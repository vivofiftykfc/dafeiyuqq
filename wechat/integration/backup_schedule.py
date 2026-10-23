"""Durable retry accounting for local backups; no WeChat or task replay logic."""
import json,os,time
from pathlib import Path
from contextlib import contextmanager
from privacy_policy import ROOT

class BackupDeferred(RuntimeError):pass

def read(project=ROOT):
    file=Path(project)/'runtime/backup-schedule.json'
    if not file.exists():return {'version':1,'phase':'idle','consecutive_failures':0,'next_attempt_at':0}
    value=json.loads(file.read_text(encoding='utf-8'))
    if not isinstance(value,dict) or value.get('version')!=1 or value.get('phase') not in ('idle','running','failed','verified') or type(value.get('consecutive_failures')) is not int or not 0<=value['consecutive_failures']<=10000:raise ValueError('Invalid backup retry state; inspect it before another attempt')
    if type(value.get('next_attempt_at')) not in (int,float) or not 0<=value['next_attempt_at']<10**12:raise ValueError('Invalid backup retry deadline')
    return value

def save(project,value):
    file=Path(project)/'runtime/backup-schedule.json';file.parent.mkdir(parents=True,exist_ok=True)
    temp=file.with_suffix('.tmp');temp.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8');temp.replace(file)

def delay(failures):return min(21600,900*2**min(max(failures-1,0),5))

def failed(project,state,error,now=None):
    now=time.time() if now is None else now;count=min(10000,state.get('consecutive_failures',0)+1)
    value={**state,'phase':'failed','consecutive_failures':count,'last_failure_at':now,'next_attempt_at':now+delay(count),'error':str(error)[:600]}
    save(project,value);return value

@contextmanager
def run_lock(project=ROOT):
    import msvcrt
    file=Path(project)/'runtime/backup-run.lock';file.parent.mkdir(parents=True,exist_ok=True)
    with file.open('a+b') as stream:
        if stream.tell()==0:stream.write(b'0');stream.flush()
        stream.seek(0)
        try:msvcrt.locking(stream.fileno(),msvcrt.LK_NBLCK,1)
        except OSError:raise BackupDeferred('Another backup owns the process lock; no new snapshot created') from None
        try:yield
        finally:stream.seek(0);msvcrt.locking(stream.fileno(),msvcrt.LK_UNLCK,1)

def status(project=ROOT):
    value=read(project)
    return {**value,'retry_ready':value['phase']!='running' and time.time()>=value['next_attempt_at'],'running_marker_is_not_liveness_proof':True}

def process_matches(pid,created):
    """Limited process query without adding psutil to the model environment."""
    import ctypes
    from ctypes import wintypes
    kernel=ctypes.WinDLL('kernel32',use_last_error=True)
    kernel.OpenProcess.argtypes=[wintypes.DWORD,wintypes.BOOL,wintypes.DWORD];kernel.OpenProcess.restype=wintypes.HANDLE
    kernel.GetProcessTimes.argtypes=[wintypes.HANDLE,*([ctypes.POINTER(wintypes.FILETIME)]*4)];kernel.GetProcessTimes.restype=wintypes.BOOL
    kernel.GetExitCodeProcess.argtypes=[wintypes.HANDLE,ctypes.POINTER(wintypes.DWORD)];kernel.GetExitCodeProcess.restype=wintypes.BOOL
    kernel.CloseHandle.argtypes=[wintypes.HANDLE];kernel.CloseHandle.restype=wintypes.BOOL
    if type(pid) is not int or pid<=0 or type(created) not in (int,float):raise ValueError('Invalid supervisor process identity')
    handle=kernel.OpenProcess(0x1000,False,pid)
    if not handle:
        code=ctypes.get_last_error()
        if code==87:return False
        raise ctypes.WinError(code)
    try:
        start,end,kernel_time,user_time=[wintypes.FILETIME() for _ in range(4)];exit_code=wintypes.DWORD()
        if not kernel.GetProcessTimes(handle,*[ctypes.byref(value) for value in (start,end,kernel_time,user_time)]) or not kernel.GetExitCodeProcess(handle,ctypes.byref(exit_code)):raise ctypes.WinError(ctypes.get_last_error())
        stamp=((start.dwHighDateTime<<32)|start.dwLowDateTime)/10000000-11644473600
        return exit_code.value==259 and abs(stamp-created)<1
    finally:kernel.CloseHandle(handle)
