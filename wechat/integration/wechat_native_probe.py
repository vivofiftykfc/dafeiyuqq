"""Read-only, PID-scoped native bridge preflight. Never loads a DLL."""
import ctypes as c
import hashlib,json,sys
from pathlib import Path
import psutil
ROOT=Path(__file__).resolve().parents[1]
VENDOR=ROOT/'vendor/helper-source'
sys.path[:0]=[str(VENDOR),str(VENDOR/'native')]
EXPECTED='wxid_bot'

def probe(binding_override=None):
    from run_selftest import K,check,modules
    from wxbot_framework.account import read_current_profile
    binding=binding_override if binding_override is not None else json.loads((ROOT/'local/binding.json').read_text(encoding='utf-8'))
    process=psutil.Process(binding['pid'])
    if abs(process.create_time()-binding['created'])>0.01:raise RuntimeError('Saved PID has been reused; explicit new binding required')
    if Path(process.exe()).resolve()!=Path(binding['executable']).resolve():raise RuntimeError('Executable mismatch')
    disk=Path(process.exe()).parent/'4.1.15.13/Weixin.dll'
    baseline=json.loads((VENDOR/'native/compatibility.json').read_text(encoding='utf-8'))
    if disk.stat().st_size!=baseline['size'] or hashlib.file_digest(disk.open('rb'),'sha256').hexdigest()!=baseline['sha256']:raise RuntimeError('Core fingerprint mismatch')
    core=modules(process.pid).get('weixin.dll')
    if not core or Path(core[1]).resolve()!=disk.resolve():raise RuntimeError('Loaded core differs from verified file')
    handle=check(K.OpenProcess(0x410,False,process.pid),'Read-only account verification')
    try:
        def read(address,size):
            buffer=c.create_string_buffer(size);count=c.c_size_t()
            check(K.ReadProcessMemory(handle,address,buffer,size,c.byref(count)),'Read account field')
            return buffer.raw[:count.value]
        profile=read_current_profile(read,core[0])
        if not profile or profile['wxid']!=EXPECTED:raise RuntimeError('Current account is not the authorized alt account')
        from wechat_contacts import resolve
        contacts=resolve(read,core[0],EXPECTED)
        return {'ready':True,'pid':process.pid,'created':process.create_time(),'profile':profile,'contacts':contacts,'core_sha256':baseline['sha256'],'injected':False}
    finally:K.CloseHandle(handle)

if __name__=='__main__':
    try:result=probe()
    except Exception as exc:result={'ready':False,'error':str(exc),'injected':False}
    (ROOT/'runtime/wechat-preflight-current.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False));sys.exit(0 if result['ready'] else 1)
