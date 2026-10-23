"""Read-only bound-alt scan; retain only a key verified against our own sent image."""
import ctypes as c,json,re,time,sys
sys.path.append(str(__import__("pathlib").Path(__file__).resolve().parents[1]/"runtime/MaiBot/.venv/Lib/site-packages"))
from pathlib import Path
from cryptography.hazmat.primitives.ciphers import Cipher,algorithms,modes
from wechat_native_probe import ROOT,probe

class MBI(c.Structure):
    _fields_=[('base',c.c_void_p),('allocation',c.c_void_p),('allocation_protect',c.c_ulong),('partition',c.c_ushort),('size',c.c_size_t),('state',c.c_ulong),('protect',c.c_ulong),('type',c.c_ulong)]

def main():
    (ROOT/'runtime/image-key-status.json').write_text(json.dumps({'state':'starting'}))
    verified=probe()
    from run_selftest import K,check
    sample=json.loads((ROOT/'runtime/image-key-sample.json').read_text())
    encrypted=Path(sample['encrypted']).read_bytes()[15:31]
    plaintext=Path(sample['plain']).read_bytes()[:16]
    handle=check(K.OpenProcess(0x410,False,verified['pid']),'Read bound alt for image-key verification')
    K.VirtualQueryEx.argtypes=[c.c_void_p,c.c_void_p,c.POINTER(MBI),c.c_size_t];K.VirtualQueryEx.restype=c.c_size_t
    start=time.monotonic();address=0;seen=set();scanned=0;found=None
    try:
        while address<0x7fffffffffff and time.monotonic()-start<90:
            m=MBI()
            if not K.VirtualQueryEx(handle,address,c.byref(m),c.sizeof(m)):break
            base=m.base or 0
            end=base+m.size
            if m.state==0x1000 and m.type==0x20000 and m.protect in (4,8,0x40,0x80):
                for offset in range(base,end,1024*1024):
                    if time.monotonic()-start>=90:break
                    n=min(1024*1024+64,end-offset);buf=c.create_string_buffer(n);read=c.c_size_t()
                    if not K.ReadProcessMemory(handle,offset,buf,n,c.byref(read)):continue
                    scanned+=read.value
                    for match in re.finditer(rb'[0-9a-fA-F]{32}',buf.raw[:read.value]):
                        value=match.group()
                        for key in (value[:16],bytes.fromhex(value.decode())):
                            if key in seen:continue
                            seen.add(key)
                            dec=Cipher(algorithms.AES(key),modes.ECB()).decryptor()
                            if dec.update(encrypted)+dec.finalize()==plaintext:found=key;break
                        if found:break
                    if found:break
            if found:break
            address=end
        probe()  # Abort if identity changed during the scan.
        if found:
            (ROOT/'local/image-cache-key.json').write_text(json.dumps({'account':'wxid_bot','key_hex':found.hex(),'verified_against_own_image':True}),encoding='utf-8')
        result={'found':bool(found),'verified':bool(found),'scanned_bytes':scanned,'seconds':round(time.monotonic()-start,2)}
        (ROOT/'runtime/image-key-status.json').write_text(json.dumps(result),encoding='utf-8')
        print(json.dumps(result))
    finally:K.CloseHandle(handle)

if __name__=='__main__':
    try:main()
    except Exception as exc:
        (ROOT/'runtime/image-key-status.json').write_text(json.dumps({'found':False,'error':type(exc).__name__+': '+str(exc)}),encoding='utf-8')
        raise
