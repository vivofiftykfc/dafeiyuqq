"""Owner-enabled autonomous activities; evaluations and group guests never inherit host rights."""
import json,sqlite3,time
from contextlib import closing
from privacy_policy import ROOT

def enabled(root=ROOT):
    try:return json.loads((root/'local/autonomy.json').read_text(encoding='utf-8')).get('high_autonomy') is True
    except (OSError,ValueError):return False

def allowed(job,root=ROOT,now=None,delivery=False):
    now=time.time() if now is None else now
    if not enabled(root) or job.get('evaluation') or job.get('scope')!='private' or job.get('state') not in (('running','done') if delivery else ('running',)) or not job.get('kind','').startswith('runtime:') or not job.get('id','').startswith('runtime:'):return False
    if not delivery and job.get('dshDeadline') and now*1000>=job['dshDeadline']:return False
    try:
        from dsh_policy import admitted
        cfg=json.loads((root/'local/tavern.json').read_text(encoding='utf-8'))
        if not admitted({**job,'state':'running'} if delivery else job,cfg):return False
        evidence=json.loads(job.get('turnContext') or '{}')
        with closing(sqlite3.connect('file:'+(root/'runtime/companion-wake.sqlite').as_posix()+'?mode=ro',uri=True)) as db:
            db.row_factory=sqlite3.Row
            owner=db.execute('SELECT * FROM owner WHERE id=1').fetchone()
            if not owner or owner['paused']:return False
            if evidence.get('wake_id'):
                from companion_wake import role_token
                row=db.execute('SELECT * FROM wakes WHERE id=?',(evidence['wake_id'],)).fetchone()
                return bool(row and row['state'] in (('preparing','sent','skipped') if delivery else ('preparing',)) and row['revision']==owner['revision'] and row['role']==role_token(cfg['roles']['private']) and row['expires']>now and row['source']==evidence.get('source_event'))
        if evidence.get('daily_key') and evidence.get('owner_revision')==owner['revision']:
            with closing(sqlite3.connect('file:'+(root/'runtime/daily-life.sqlite').as_posix()+'?mode=ro',uri=True)) as db:
                row=db.execute('SELECT state FROM entries WHERE id=?',(evidence['daily_key'],)).fetchone()
                return bool(evidence['daily_key'].startswith('private:') and row and row[0] in (('preparing','sent','skipped') if delivery else ('preparing',)))
    except (OSError,ValueError,KeyError,TypeError,sqlite3.Error):return False
    return False

def action_turn(job,root=ROOT):
    return bool(job.get('state')=='running' and not job.get('evaluation') and ((job.get('kind')=='chat' and job.get('id','').startswith('wechat:')) or allowed(job,root)))

if __name__=='__main__':
    import sys
    jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'))
    print(json.dumps({'allowed':allowed(jobs.get(sys.argv[1],{}))}))
