"""Consistent SQLite backups and hash-verified restore staging; local only."""
import argparse,hashlib,json,shutil,sqlite3,time,uuid,re
from contextlib import closing
from pathlib import Path
from privacy_policy import ROOT

def digest(file):
 with Path(file).open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()

def check_room(src,target,reserve):
 size=Path(src).stat().st_size
 if Path(src).suffix in ('.db','.sqlite'):
  wal=Path(str(src)+'-wal')
  if wal.exists():size+=wal.stat().st_size
 if shutil.disk_usage(target).free-size<reserve:raise RuntimeError('Backup stopped: next file would use reserved free space')

def copy_database(src,dest):
 with closing(sqlite3.connect(Path(src).resolve().as_uri()+'?mode=ro',uri=True)) as source,closing(sqlite3.connect(dest)) as output:
  source.backup(output)
  if output.execute('PRAGMA quick_check').fetchone()[0]!='ok':raise ValueError('Database snapshot invalid')
def _copy_snapshot(target):
 from backup_retention import policy
 reserve=policy(ROOT)['minimum_free_gib']*1024**3
 files=set()
 for base in ('integration','assets','local','tools','prompts','docs','runtime/models','runtime/isolated/private-owner/config','runtime/isolated/group-work/config'):
  files.update(p for p in (ROOT/base).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ('.pyc',))
 for base in ('runtime/isolated','runtime/meme-library','runtime/owner-actions','runtime/tavern-observations','runtime/media'):
  files.update(p for p in (ROOT/base).rglob('*') if p.is_file() and (p.suffix in ('.db','.sqlite') or base in ('runtime/meme-library','runtime/tavern-observations','runtime/media')))
 files.update((ROOT/'runtime').glob('*.sqlite'));files.update((ROOT/'runtime').glob('*.json'))
 files.update(ROOT.glob('*.cmd'));files.update(ROOT.glob('*.md'))
 # DSH runtime state and tool evidence; dependencies are rebuilt from the lockfile.
 for base in ('runtime/dsh-home','runtime/dsh-requests','runtime/dsh-workspace','runtime/dsh-workspaces/characters','runtime/wechat-social-index'):
  files.update(p for p in (ROOT/base).rglob('*') if p.is_file() and not any(part in ('node_modules','cache','dependencies','dsh-runtimes','logs') for part in p.relative_to(ROOT/base).parts))
 files.update((ROOT/'runtime').glob('dsh-*.jsonl'))
 # The bound SNS/media codec is a runtime dependency, not an installed wheel.
 files.update(p for p in (ROOT/'vendor/wechatapi/wechatauto/db.py',ROOT/'vendor/wechatapi/LICENSE') if p.is_file())
 # A file: plugin dependency needs its pinned source to reinstall after restore.
 pinned=ROOT/'runtime/research/dsh-soul-md'
 files.update(p for p in pinned.rglob('*') if p.is_file() and not any(part in ('.git','node_modules') for part in p.relative_to(pinned).parts))
 for slug in ('private-owner','group-work'):
  files.update(p for p in (ROOT/'runtime/isolated'/slug/'data').rglob('*') if p.is_file() and not p.name.endswith(('-wal','-shm')))
 files.update(p for p in (ROOT/'runtime/owner-actions/private/workspace').rglob('*') if p.is_file())
 files.update(p for p in (ROOT/'runtime/owner-actions/private/state').glob('*.json') if p.is_file())
 files.update(p for p in (ROOT/'vendor/helper-source/native').rglob('*') if p.is_file() and p.suffix in ('.py','.cpp','.h','.inc','.dll'))
 # Native Python bindings are imported directly from this source tree, not pip.
 for base in ('vendor/helper-source/wxbot_framework','runtime/MaiBot/src','runtime/MaiBot/config'):
  files.update(p for p in (ROOT/base).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ('.pyc',))
 files.update(p for p in (ROOT/'vendor/helper-source/native').rglob('*') if p.is_file() and p.suffix in ('.c','.hpp','.ps1','.json','.md','.txt','.def'))
 for name in ('vendor/helper-source/requirements.txt','vendor/helper-source/THIRD_PARTY_NOTICES.md','runtime/MaiBot/pyproject.toml','runtime/MaiBot/uv.lock','runtime/MaiBot/requirements.txt'):
  if (ROOT/name).is_file():files.add(ROOT/name)
 for name in ('README.md','LICENSE','MANIFEST.in','setup.py','bot.py'):
  if (ROOT/'runtime/MaiBot'/name).is_file():files.add(ROOT/'runtime/MaiBot'/name)
 manifest={}
 for src in sorted(files):
  if src.name.endswith(('-wal','-shm')) or (src.name.endswith('.lock') and src.name not in ('uv.lock','poetry.lock','Pipfile.lock','bun.lock')):continue
  rel=src.relative_to(ROOT);dest=target/rel;dest.parent.mkdir(parents=True,exist_ok=True)
  check_room(src,target,reserve)
  if src.suffix in ('.db','.sqlite'):
   copy_database(src,dest)
  else:
   try:shutil.copy2(src,dest)
   except PermissionError:raise RuntimeError('Backup locked file: '+rel.as_posix()) from None
  manifest[rel.as_posix()]=digest(dest)
 # The active character cards and conversations live outside the bridge root.
 # Preserve them under a separate restore root; never overwrite the live instance here.
 tavern=Path('__TAVERN_ROOT__')
 external=set()
 for base in ('data/default-user/characters','data/default-user/chats','data/default-user/worlds','plugins/dafeiyu','public/scripts/extensions/third-party/dafeiyu'):
  external.update(p for p in (tavern/base).rglob('*') if p.is_file())
 for name in ('data/default-user/settings.json','data/default-user/secrets.json','config.yaml','package.json','package-lock.json'):
  if (tavern/name).is_file():external.add(tavern/name)
 for src in sorted(external):
  rel=Path('tavern-instance')/src.relative_to(tavern);dest=target/rel;dest.parent.mkdir(parents=True,exist_ok=True)
  check_room(src,target,reserve)
  shutil.copy2(src,dest);manifest[rel.as_posix()]=digest(dest)
 from voice_paths import VOICE_ROOT
 for src in sorted(p for p in VOICE_ROOT.rglob('*') if p.is_file() and not any(part in ('venv','tmp') for part in p.relative_to(VOICE_ROOT).parts) and not p.name.endswith('.tar.bz2')):
  rel=Path('voice-instance')/src.relative_to(VOICE_ROOT);dest=target/rel;dest.parent.mkdir(parents=True,exist_ok=True)
  check_room(src,target,reserve)
  shutil.copy2(src,dest);manifest[rel.as_posix()]=digest(dest)
 (target/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
 from recovery_contract import audit
 readiness=audit(target,manifest)
 (target/'restore-readiness.json').write_text(json.dumps(readiness,ensure_ascii=False,indent=2),encoding='utf-8')
 if readiness['missing']:raise RuntimeError('Backup is incomplete; inspect restore-readiness.json')
 return target
def verify(folder):
 folder=Path(folder).resolve();m=json.loads((folder/'manifest.json').read_text())
 for rel,expected_digest in m.items():
  p=(folder/rel).resolve()
  if not p.is_relative_to(folder) or digest(p)!=expected_digest:raise ValueError('Backup integrity failed')
  if p.suffix in ('.sqlite','.db'):
   with closing(sqlite3.connect(p.as_uri()+'?mode=ro',uri=True)) as c:
    if c.execute('PRAGMA quick_check').fetchone()[0]!='ok':raise ValueError('Database invalid')
 return m

def backup(force=False):
 from backup_schedule import run_lock
 with run_lock(ROOT):return _backup(force)

def _backup(force=False):
 from backup_retention import policy,write_info,cleanup,cleanup_failed,managed,MANAGER
 from backup_schedule import read,save,failed,BackupDeferred
 state=read(ROOT);now=time.time()
 if state['phase']=='running':
  # The OS lock is now ours: the old writer is gone. Adopt only fully verified
  # output; an unfinished directory is not a successful backup or task replay.
  previous=Path(state.get('target','')).resolve();base=(ROOT/'runtime/recovery').resolve()
  matched=False
  if previous.parent==base and previous.is_dir():
   try:
    info=json.loads((previous/'backup-info.json').read_text(encoding='utf-8'))
    matched=bool(re.fullmatch(r'[0-9a-f]{32}',str(state.get('attempt_id','')))) and info.get('manager')==MANAGER and info.get('project')==str(ROOT.resolve()) and info.get('snapshot')==previous.name and info.get('attempt_id')==state.get('attempt_id')
   except (OSError,ValueError,TypeError,AttributeError):pass
  if matched and managed(previous,ROOT):
   try:manifest=verify(previous)
   except (OSError,ValueError,sqlite3.Error):pass
   else:
    save(ROOT,{**state,'phase':'verified','last_success_at':now,'next_attempt_at':0,'consecutive_failures':0,'snapshot':str(previous)})
    return previous
  if previous.parent==base and previous.is_dir():
   marker=previous/'backup-info.json'
   try:
    info=json.loads(marker.read_text(encoding='utf-8'))
    if matched:write_info(previous,ROOT,'failed',attempt_id=state['attempt_id'],failure_cleanup_version=1,error='Writer interrupted before verification')
   except (OSError,ValueError):pass
  state=failed(ROOT,state,'Previous backup was interrupted; partial output is not a verified recovery source',now)
 if not force and now<state['next_attempt_at']:raise BackupDeferred('Backup retry deferred until '+time.strftime('%Y-%m-%d %H:%M:%S',time.localtime(state['next_attempt_at'])))
 config=policy(ROOT)
 if shutil.disk_usage(ROOT).free<config['minimum_free_gib']*1024**3:
  failed(ROOT,state,'Backup stopped: free space below configured reserve',now)
  raise RuntimeError('Backup stopped: free space below configured reserve')
 base=ROOT/'runtime/recovery';base.mkdir(parents=True,exist_ok=True)
 from backup_retention import snapshot_root
 base=snapshot_root(ROOT)
 for offset in range(60):
  target=base/time.strftime('%Y%m%d-%H%M%S',time.localtime(now+offset))
  if not target.exists():break
 else:raise RuntimeError('Too many backups with the same timestamp')
 attempt=uuid.uuid4().hex
 state={**state,'phase':'running','attempt_id':attempt,'target':str(target),'last_attempt_at':now,'next_attempt_at':now+900}
 save(ROOT,state);target.mkdir(exist_ok=False)
 write_info(target,ROOT,'building',attempt_id=attempt,failure_cleanup_version=1)
 try:
  _copy_snapshot(target);manifest=verify(target)
  write_info(target,ROOT,'verified',attempt_id=attempt,manifest_sha256=digest(target/'manifest.json'),files=len(manifest))
  save(ROOT,{**state,'phase':'verified','last_success_at':time.time(),'next_attempt_at':0,'consecutive_failures':0,'snapshot':str(target)})
 except Exception as error:
  failed(ROOT,state,type(error).__name__+': '+str(error))
  write_info(target,ROOT,'failed',attempt_id=attempt,failure_cleanup_version=1,error=type(error).__name__+': '+str(error))
  try:cleanup_failed(ROOT)
  except Exception:pass # Never hide the original backup failure with cleanup.
  raise
 try:
  report=cleanup(ROOT)
  (ROOT/'runtime/backup-retention-current.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 except Exception as error:
  # A good new snapshot remains good even if optional cleanup cannot run.
  (ROOT/'runtime/backup-retention-current.json').write_text(json.dumps({'cleanup_failed':True,'error':type(error).__name__+': '+str(error),'new_verified_snapshot':str(target)}),encoding='utf-8')
 return target
def stage(folder):
 from backup_retention import maintenance_lock
 with maintenance_lock(ROOT):return _stage(folder)

def _stage(folder):
 m=verify(folder)
 from recovery_contract import audit
 readiness=audit(folder,m)
 if readiness['missing']:raise ValueError('Backup dependencies incomplete; refusing restore staging')
 target=ROOT/'runtime/recovery-staging'/str(int(time.time()));target.mkdir(parents=True)
 (target/'restore-source.json').write_text(json.dumps({'source':str(Path(folder).resolve()),'created':time.time(),'state':'staging'}),encoding='utf-8')
 for rel in m:
  dest=target/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(Path(folder)/rel,dest)
 shutil.copy2(Path(folder)/'manifest.json',target/'manifest.json')
 verify(target)
 (target/'restore-readiness.json').write_text(json.dumps(audit(target,m),ensure_ascii=False,indent=2),encoding='utf-8')
 return target
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--verify');p.add_argument('--stage');p.add_argument('--retention-plan',action='store_true');p.add_argument('--prune',action='store_true');p.add_argument('--force',action='store_true');a=p.parse_args()
 if a.verify:print('verified',len(verify(a.verify)))
 elif a.stage:print(stage(a.stage))
 elif a.retention_plan or a.prune:
  from backup_retention import plan,cleanup
  print(json.dumps(cleanup(ROOT) if a.prune else plan(ROOT),ensure_ascii=False,indent=2))
 else:
  from backup_schedule import BackupDeferred
  try:folder=backup(force=a.force)
  except BackupDeferred as error:print(str(error));raise SystemExit(75)
  print(folder);print('verified',json.loads((folder/'backup-info.json').read_text(encoding='utf-8'))['files'])
