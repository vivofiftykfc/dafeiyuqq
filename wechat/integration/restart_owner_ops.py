import subprocess,psutil,sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
db=sqlite3.connect(ROOT/'runtime/owner-actions/receipts.sqlite')
if db.execute("SELECT count(*) FROM jobs WHERE status='running'").fetchone()[0]:raise RuntimeError('Owner task running; do not interrupt')
db.close()
target=ROOT/'integration/owner_ops.py'
for proc in psutil.process_iter(['pid','cmdline']):
    try:
        if any(Path(a).resolve()==target for a in proc.info['cmdline'] or [] if a.endswith('owner_ops.py')):
            proc.terminate();proc.wait(5)
    except psutil.NoSuchProcess:pass
    except psutil.AccessDenied:continue
with (ROOT/'runtime/owner-ops.log').open('ab') as out,(ROOT/'runtime/owner-ops.err.log').open('ab') as err:
    p=subprocess.Popen([str(ROOT/'runtime/MaiBot/.venv/Scripts/python.exe'),'-X','utf8',str(target)],cwd=ROOT,stdout=out,stderr=err,creationflags=subprocess.CREATE_NO_WINDOW)
(ROOT/'runtime/owner-ops.pid').write_text(str(p.pid))
print('Owner broker restarted',p.pid)
