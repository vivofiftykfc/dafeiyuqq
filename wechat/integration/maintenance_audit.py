"""Evidence for owner-authorized self-maintenance; no invented completion."""
import ast,hashlib,json,time
from privacy_policy import ROOT,validate_isolation
def snapshot():
    return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'integration').glob('*.py')}
def validate(before):
    changed=[];errors=[]
    for relative,digest in snapshot().items():
        if before.get(relative)==digest:continue
        changed.append(relative)
        try:ast.parse((ROOT/relative).read_text(encoding='utf-8-sig'))
        except Exception as exc:errors.append({'path':relative,'error':type(exc).__name__})
    try:validate_isolation()
    except Exception as exc:errors.append({'path':'isolation','error':type(exc).__name__})
    report={'time':time.time(),'changed_python':changed,'errors':errors,'syntax_and_isolation_only':True,'live_behavior_verified':False,'auto_reload':False}
    (ROOT/'runtime/maintenance-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    return report
