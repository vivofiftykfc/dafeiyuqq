"""Bounded retention for verified, explicitly managed local snapshots only."""
import hashlib,json,os,re,shutil,time
from contextlib import contextmanager
from datetime import datetime,timezone,timedelta
from pathlib import Path
from privacy_policy import ROOT

MANAGER='dafeiyu-local-backup-v2'
DEFAULT={'enabled':True,'keep_latest':2,'daily':14,'weekly':8,'monthly':6,'minimum_free_gib':10,'keep_failed':2}

def policy(project=ROOT):
    path=Path(project)/'local/backup-retention.json'
    value={**DEFAULT,**(json.loads(path.read_text(encoding='utf-8')) if path.exists() else {})}
    if type(value['enabled']) is not bool:raise ValueError('Invalid backup retention switch')
    for key in ('keep_latest','daily','weekly','monthly','minimum_free_gib','keep_failed'):
        if type(value[key]) is not int or not 0<=value[key]<=365:raise ValueError('Invalid backup retention count')
    if value['keep_latest']<2 or value['minimum_free_gib']<1 or value['keep_failed']<1:raise ValueError('At least two snapshots, one failure record and free-space reserve required')
    return value

def reparse(path):
    stat=Path(path).lstat()
    return Path(path).is_symlink() or bool(getattr(stat,'st_file_attributes',0)&0x400)

def snapshot_root(project):
    project=Path(project).resolve();root=project/'runtime/recovery'
    if reparse(root) or root.resolve()!=root:raise ValueError('Recovery root may not redirect outside the workspace')
    return root

@contextmanager
def maintenance_lock(project=ROOT):
    # Windows interprocess lock shared with restore staging; no stale PID locks.
    import msvcrt
    path=Path(project)/'runtime/recovery-maintenance.lock';path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('a+b') as stream:
        if stream.tell()==0:stream.write(b'0');stream.flush()
        stream.seek(0)
        try:msvcrt.locking(stream.fileno(),msvcrt.LK_NBLCK,1)
        except OSError:raise RuntimeError('Restore staging or backup cleanup is already running') from None
        try:yield
        finally:stream.seek(0);msvcrt.locking(stream.fileno(),msvcrt.LK_UNLCK,1)

def write_info(folder,project,state,**details):
    value={'manager':MANAGER,'project':str(Path(project).resolve()),'snapshot':Path(folder).name,'state':state,'updated':time.time(),**details}
    dest=Path(folder)/'backup-info.json';tmp=dest.with_suffix('.tmp')
    tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8');tmp.replace(dest)

def managed(folder,project):
    try:
        if reparse(folder) or folder.resolve().parent!=snapshot_root(project):return False
        for name in ('backup-info.json','manifest.json'):
            if reparse(folder/name):return False
        info=json.loads((folder/'backup-info.json').read_text(encoding='utf-8'))
        if not isinstance(info,dict):return False
        return (info.get('manager')==MANAGER and info.get('project')==str(Path(project).resolve())
            and info.get('snapshot')==folder.name and info.get('state')=='verified'
            and info.get('manifest_sha256')==hashlib.sha256((folder/'manifest.json').read_bytes()).hexdigest())
    except (OSError,ValueError,TypeError):return False

def staged_sources(project,root):
    protected=set();staging=Path(project)/'runtime/recovery-staging'
    if not staging.exists():return protected
    if reparse(staging):raise ValueError('Recovery staging root redirects elsewhere')
    for folder in staging.iterdir():
        if not folder.is_dir() or reparse(folder):continue
        marker=folder/'restore-source.json'
        if not marker.exists():continue
        if reparse(marker):raise ValueError('Restore source marker redirects elsewhere')
        try:
            source=Path(json.loads(marker.read_text(encoding='utf-8'))['source']).resolve()
            if source.parent==root:protected.add(source.name)
        except (OSError,ValueError,KeyError,TypeError):
            # Unreadable staging evidence must not silently permit deleting a source.
            raise ValueError('Cannot read active restore source; cleanup stopped') from None
    return protected

def plan(project=ROOT):
    project=Path(project).resolve();root=snapshot_root(project);config=policy(project)
    folders=sorted((p for p in root.iterdir() if p.is_dir() and re.fullmatch(r'\d{8}-\d{6}',p.name)),reverse=True)
    candidates=[];protected={};staged=staged_sources(project,root)
    for folder in folders:
        if not managed(folder,project):protected[folder.name]='legacy_incomplete_or_unverified';continue
        if (folder/'.keep').exists():protected[folder.name]='pinned';continue
        if folder.name in staged:protected[folder.name]='restore_source';continue
        candidates.append(folder)
    keep=set(folder.name for folder in candidates[:config['keep_latest']])
    for count,key in [(config['daily'],lambda d:d.date()),(config['weekly'],lambda d:d.isocalendar()[:2]),(config['monthly'],lambda d:(d.year,d.month))]:
        buckets=set()
        for folder in candidates:
            try:bucket=key(datetime.strptime(folder.name,'%Y%m%d-%H%M%S'))
            except ValueError:protected[folder.name]='invalid_timestamp';continue
            if bucket in buckets:continue
            if len(buckets)>=count:break
            buckets.add(bucket);keep.add(folder.name)
    victims=[folder.name for folder in candidates if folder.name not in keep and folder.name not in protected] if config['enabled'] else []
    return {'policy':config,'keep':sorted(keep,reverse=True),'protected':protected,'delete':victims,'root':str(root)}

def assert_plain_tree(folder,root):
    folder=Path(folder)
    if folder.resolve().parent!=root or not re.fullmatch(r'\d{8}-\d{6}',folder.name) or reparse(folder):raise ValueError('Cleanup target escaped snapshot root')
    for parent,dirs,files in os.walk(folder,followlinks=False):
        for name in dirs+files:
            if reparse(Path(parent)/name):raise ValueError('Snapshot contains a link or junction; retained')

def cleanup(project=ROOT,verify_snapshot=None):
    if verify_snapshot is None:
        from local_backup import verify as verify_snapshot
    project=Path(project).resolve()
    with maintenance_lock(project):
        result=plan(project);result['deleted']=[]
        if not result['delete']:return result
        # Revalidate an actually retained snapshot immediately before any deletion.
        if not result['keep']:raise ValueError('No verified retained snapshot; cleanup refused')
        root=Path(result['root']);verify_snapshot(root/result['keep'][0])
        for name in result['delete']:
            current=plan(project)
            if name not in current['delete']:continue
            target=root/name;assert_plain_tree(target,root)
            if not managed(target,project):raise ValueError('Snapshot changed during cleanup')
            shutil.rmtree(target)
            result['deleted'].append(name)
        return result

def cleanup_failed(project=ROOT):
    """Only new, attempt-marked partial output; legacy or pinned data survives."""
    project=Path(project).resolve()
    with maintenance_lock(project):
        root=snapshot_root(project);config=policy(project);protected=staged_sources(project,root);eligible=[]
        for folder in root.iterdir():
            if not folder.is_dir() or not re.fullmatch(r'\d{8}-\d{6}',folder.name) or reparse(folder) or folder.resolve().parent!=root or folder.name in protected or (folder/'.keep').exists():continue
            marker=folder/'backup-info.json'
            try:
                if reparse(marker):continue
                info=json.loads(marker.read_text(encoding='utf-8'))
                if (info.get('manager')==MANAGER and info.get('project')==str(project) and info.get('snapshot')==folder.name
                    and info.get('state')=='failed' and info.get('failure_cleanup_version')==1 and re.fullmatch(r'[0-9a-f]{32}',str(info.get('attempt_id','')))):
                    eligible.append(folder)
            except (OSError,ValueError,TypeError,AttributeError):continue
        eligible.sort(reverse=True);deleted=[]
        if config['enabled']:
            for folder in eligible[config['keep_failed']:]:
                assert_plain_tree(folder,root)
                audit=project/'runtime/backup-failures.jsonl'
                with audit.open('a',encoding='utf-8') as stream:stream.write(json.dumps({'removed_partial_snapshot':folder.name,'info':json.loads((folder/'backup-info.json').read_text(encoding='utf-8')),'time':time.time()},ensure_ascii=False)+'\n')
                shutil.rmtree(folder);deleted.append(folder.name)
        return {'deleted_partial_snapshots':deleted,'retained_latest_failed':config['keep_failed'],'legacy_failed_untouched':True}

def status(project=ROOT):
    project=Path(project).resolve();root=snapshot_root(project)
    verified=sorted((folder for folder in root.iterdir() if folder.is_dir() and managed(folder,project)),reverse=True)
    latest=None
    if verified:
        info=json.loads((verified[0]/'backup-info.json').read_text(encoding='utf-8'))
        latest={'snapshot':verified[0].name,'path':str(verified[0]),'integrity_verified_at':info['updated'],'verified_at_local':datetime.fromtimestamp(info['updated'],timezone(timedelta(hours=8))).isoformat(timespec='seconds'),'files':info.get('files')}
    outcome={'checked_at':time.time(),'policy':policy(project),'latest_managed_verified_snapshot':latest,'limits':'Integrity was verified at backup creation, not rehashed by this query. Staging tests do not prove live failover or a new-machine reinstall.'}
    from backup_schedule import status as retry_status
    try:outcome['retry_schedule']=retry_status(project)
    except (OSError,ValueError,TypeError) as error:outcome['retry_schedule_error']=type(error).__name__+': '+str(error)
    supervisor=project/'runtime/supervisor-state.json'
    if supervisor.exists():
        try:
            from backup_schedule import process_matches
            state=json.loads(supervisor.read_text(encoding='utf-8'));same_process=process_matches(state['pid'],state['process_created'])
            age=time.time()-state['time']
            outcome['supervisor']={'pid':state['pid'],'same_process_alive':same_process,'heartbeat_age_seconds':round(age,1),'heartbeat_current':same_process and -5<=age<=120,'backup':state.get('backup'),'backend_start_exit_code':state.get('backend_start_exit_code'),'scope':'Local service supervisor only; not evidence of a future reboot or native WeChat acceptance'}
        except (OSError,ValueError,KeyError,TypeError) as error:outcome['supervisor']={'same_process_alive':None,'inspection_error':type(error).__name__}
    start_check=project/'runtime/backend-start-last.json'
    if start_check.exists():
        try:
            check=json.loads(start_check.read_text(encoding='utf-8-sig'));age=time.time()-check['checked_at']
            outcome['last_service_start_check']={'start_script_completed':check['start_script_completed'] is True,'age_seconds':round(age,1),'current':-5<=age<=120}
        except (OSError,ValueError,KeyError,TypeError):outcome['last_service_start_check']={'current':False,'error':'Malformed service start result'}
    try:
        selection=plan(project);outcome['retention']={key:len(selection[key]) for key in ('keep','protected','delete')}
    except (OSError,ValueError) as error:outcome['retention_error']=type(error).__name__+': '+str(error)
    proof=project/'runtime/staged-recovery-acceptance.json'
    if proof.exists():
        data=json.loads(proof.read_text(encoding='utf-8'))
        if not isinstance(data,dict):raise ValueError('Malformed isolated restore test record')
        outcome['latest_isolated_restore_test']={key:data.get(key) for key in ('stage','native_imports_from_stage','network_disabled','target_process_access_disabled','services_started','wechat_sent','staged_voice_generation','new_machine_reinstall_proven')}
        stage=Path(data.get('stage','')).resolve();source_marker=stage/'restore-source.json'
        if stage.is_relative_to(project/'runtime/recovery-staging') and source_marker.is_file():
            source=Path(json.loads(source_marker.read_text(encoding='utf-8'))['source']).resolve()
            if source.parent==root:outcome['latest_isolated_restore_test']['source_snapshot']=source.name
    return outcome

if __name__=='__main__':
    import sys
    if sys.argv[1:]!=['--status']:raise ValueError('Only the read-only status entry is supported here')
    print(json.dumps(status(),ensure_ascii=False))
