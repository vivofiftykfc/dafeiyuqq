import subprocess,psutil,json,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
target=ROOT/'integration/media_service.py'
matched=[]
for proc in psutil.process_iter(['pid','cmdline']):
 try:
  args=proc.info['cmdline'] or []
  if any(Path(a).resolve()==target for a in args if a.endswith('media_service.py')):matched.append(proc)
 except (psutil.Error,OSError):pass
for proc in matched:
 try:proc.terminate();proc.wait(5)
 except psutil.NoSuchProcess:pass
out=(ROOT/'runtime/media.log').open('ab');err=(ROOT/'runtime/media.err.log').open('ab')
p=subprocess.Popen([str(ROOT/'runtime/MaiBot/.venv/Scripts/python.exe'),'-X','utf8',str(target)],cwd=ROOT,stdout=out,stderr=err,creationflags=subprocess.CREATE_NO_WINDOW)
(ROOT/'runtime/media.pid').write_text(str(p.pid))
