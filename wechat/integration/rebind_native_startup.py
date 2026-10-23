"""Read-only identity verification before rebinding a restarted authorized alt."""
import json,sys,time
from pathlib import Path
import psutil
from wechat_native_probe import ROOT,probe

def main():
    file=ROOT/'local/binding.json'
    saved=json.loads(file.read_text(encoding='utf-8'))
    try:
        probe();print('Existing WeChat alt binding verified');return 0
    except Exception:pass
    expected_path=Path(saved['executable']).resolve()
    found=[]
    for proc in psutil.process_iter(['pid','name']):
        if (proc.info['name'] or '').lower()!=expected_path.name.lower():continue
        try:
            if Path(proc.exe()).resolve()!=expected_path:continue
            candidate={**saved,'pid':proc.pid,'created':proc.create_time(),'executable':str(expected_path)}
            probe(candidate) # Includes core fingerprint, exact wxid, and contact resolution.
            found.append(candidate)
        except Exception:continue
    if len(found)!=1:
        print('ACTION: Log in to the authorized WeChat alt, then run launcher again. No binding changed.');return 2
    file.with_name('binding.before-startup-'+str(time.time_ns())+'.json').write_bytes(file.read_bytes())
    tmp=file.with_suffix('.startup.tmp');tmp.write_text(json.dumps(found[0],ensure_ascii=False,indent=2),encoding='utf-8');tmp.replace(file)
    print('Authorized WeChat alt verified; refreshed process binding');return 0

if __name__=='__main__':sys.exit(main())
