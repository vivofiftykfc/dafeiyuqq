"""Local process supervisor. Never starts, closes, or switches WeChat accounts."""
import ctypes,json,os,subprocess,time
from pathlib import Path
import psutil
from backup_worker import AutoBackup
ROOT=Path(__file__).resolve().parents[1]
def main():
    kernel=ctypes.WinDLL('kernel32',use_last_error=True);kernel.CreateMutexW.restype=ctypes.c_void_p
    mutex=kernel.CreateMutexW(None,False,'Local\\DafeiyuSupervisor')
    if not mutex or ctypes.get_last_error()==183:return
    log=(ROOT/'runtime/supervisor.log').open('ab')
    backups=AutoBackup(ROOT)
    (ROOT/'runtime/supervisor.pid').write_text(str(os.getpid()),encoding='ascii')
    while not (ROOT/'runtime/supervisor.stop').exists():
        try:
            p=subprocess.Popen(['powershell.exe','-NoProfile','-ExecutionPolicy','Bypass','-File',str(ROOT/'integration/start-local.ps1'),'-NoBrowser'],cwd=ROOT,stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW)
            try:p.wait(180)
            except subprocess.TimeoutExpired:p.kill();p.wait()
            existing=False;uncertain=False
            for process in psutil.process_iter(['cmdline','name']):
                try:
                    if process.info['cmdline'] is None and 'python' in (process.info['name'] or '').lower():uncertain=True
                    args=process.info['cmdline'] or []
                    if any(str(a).endswith('wechat_bridge.py') and Path(a).resolve()==ROOT/'integration/wechat_bridge.py' for a in args):existing=True
                except (psutil.AccessDenied,psutil.NoSuchProcess):uncertain=True
            bridge_pid=ROOT/'runtime/wechat-bridge.pid'
            if bridge_pid.exists():
                try:
                    proc=psutil.Process(int(bridge_pid.read_text()))
                    # A recycled PID must not suppress recovery forever.
                    same_start=abs(proc.create_time()-bridge_pid.stat().st_mtime)<60
                    existing=existing or (same_start and 'python' in proc.name().lower())
                except psutil.NoSuchProcess:pass
                except (ValueError,OSError,psutil.AccessDenied):uncertain=True
            if not existing and not uncertain and not (ROOT/'runtime/wechat-bridge.stop').exists():
                # The bridge itself rechecks the exact account/version before attachment.
                subprocess.Popen([str(ROOT/'runtime/wechat-env/Scripts/python.exe'),'-X','utf8',str(ROOT/'integration/wechat_bridge.py')],cwd=ROOT,stdout=log,stderr=log,creationflags=subprocess.CREATE_NO_WINDOW)
            backup_status=backups.tick(log)
            (ROOT/'runtime/supervisor-state.json').write_text(json.dumps({'time':time.time(),'pid':os.getpid(),'process_created':psutil.Process().create_time(),'backend_start_exit_code':p.returncode,'bridge_found':existing,'inspection_uncertain':uncertain,'backup':backup_status}),encoding='utf-8')
        except Exception as e:log.write((type(e).__name__+'\n').encode());log.flush()
        time.sleep(30)
if __name__=='__main__':main()
