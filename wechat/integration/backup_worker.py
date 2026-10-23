"""Supervisor-owned background backup handle; health checks never wait for copying."""
import subprocess,time
from pathlib import Path
from backup_schedule import read

class AutoBackup:
    def __init__(self,project):self.root=Path(project);self.worker=None;self.started=None;self.stop_requested=False
    def tick(self,log,now=None):
        now=time.time() if now is None else now
        if self.worker is not None:
            result=self.worker.poll()
            if result is None:
                if now-self.started>240 and not self.stop_requested:
                    self.stop_requested=True
                    # The PID came from our Popen handle, never a stale marker.
                    subprocess.run(['taskkill','/PID',str(self.worker.pid),'/T','/F'],stdout=log,stderr=log,timeout=15,creationflags=subprocess.CREATE_NO_WINDOW)
                return {'state':'running' if not self.stop_requested else 'timeout_stop_requested','pid':self.worker.pid}
            if result==0:(self.root/'runtime/last-auto-backup.txt').write_text(time.strftime('%Y-%m-%d',time.localtime(now)),encoding='utf-8')
            self.worker=None;self.started=None;self.stop_requested=False
            return {'state':'finished','returncode':result}
        stamp=self.root/'runtime/last-auto-backup.txt';today=time.strftime('%Y-%m-%d',time.localtime(now))
        if stamp.exists() and stamp.read_text(encoding='utf-8').strip()==today:return {'state':'already_completed_today'}
        schedule=read(self.root)
        if now<schedule['next_attempt_at']:return {'state':'backoff','next_attempt_at':schedule['next_attempt_at']}
        self.worker=subprocess.Popen([str(self.root/'runtime/MaiBot/.venv/Scripts/python.exe'),'-X','utf8',str(self.root/'integration/local_backup.py')],cwd=self.root,stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW)
        self.started=now
        return {'state':'started','pid':self.worker.pid}
