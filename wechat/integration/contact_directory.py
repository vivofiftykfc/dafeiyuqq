"""Read only bound account contact metadata. Never read chat contents here."""
import importlib.util,json,sys,time
from pathlib import Path
from privacy_policy import ROOT
from wechat_social_reader import ACCOUNT

def reader(prepare=False):
    if prepare:
        from wechat_native_probe import probe
        verified=probe()
        if verified['profile']['wxid']!='wxid_bot':raise ValueError('Wrong account')
    spec=importlib.util.spec_from_file_location('contact_codec',ROOT/'vendor/wechatapi/wechatauto/db.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    class BoundContacts(module.WeChatDB):
        def _collect_db_files(self):
            p=ACCOUNT/'db_storage/contact/contact.db'
            return [('contact/contact.db',str(p),p.stat().st_size)]
        def _find_weixin_pids(self):
            if not prepare:raise RuntimeError('Contact reads cannot inspect processes')
            return [verified['pid']]
        def _auto_diagnose_key_failure(self,rel):raise RuntimeError('Contact index requires preparation')
        def _load_or_extract_keys(self,master_key=None):
            if prepare:return super()._load_or_extract_keys(master_key)
            saved=json.loads(Path(self.keys_file).read_text(encoding='utf-8'))
            self._keys={rel:bytes.fromhex(saved[rel]) for rel,_,_ in self._db_files if rel in saved}
            if any(not self._key_works(rel) for rel,_,_ in self._db_files):raise RuntimeError('Contact index requires preparation')
    return BoundContacts(db_dir=str(ACCOUNT.parent),account=ACCOUNT.name,keys_file=str(ROOT/'local/contact-directory-key.json'),workdir=str(ROOT/'runtime/contact-directory'))

def refresh(prepare=False):
    db=reader(prepare);connection=db._open('contact/contact.db')
    try:
        columns=[r[1] for r in connection.execute('PRAGMA table_info(contact)')]
        if '--schema' in sys.argv:return {'columns':columns}
        # Schema and friend flag must be verified before enabling alias resolution.
        required={'username','alias','nick_name','remark','local_type','delete_flag','verify_flag'}
        if not required.issubset(columns):raise ValueError('Contact schema changed')
        rows=connection.execute('SELECT username,alias,nick_name,remark,local_type FROM contact WHERE delete_flag=0 AND verify_flag=0').fetchall()
        items=[]
        import re
        for row in rows:
            peer=row['username']
            if not isinstance(peer,str) or not re.fullmatch(r'wxid_[A-Za-z0-9_-]{3,80}',peer):continue
            if not isinstance(row['local_type'],int) or not row['local_type']&1:continue
            items.append({'peer':peer,'alias':str(row['alias'] or ''),'label':str(row['remark'] or row['nick_name'] or peer)[:80]})
        value={'account':'wxid_bot','updated':int(time.time()*1000),'items':items}
        dest=Path('__PROJECT_ROOT__/qq-bridge/state/wechat-core/contact-directory.json')
        temp=dest.with_suffix('.tmp');temp.write_text(json.dumps(value,ensure_ascii=False),encoding='utf-8');temp.replace(dest)
        return {'ok':True,'count':len(items)}
    finally:connection.close()

if __name__=='__main__':
    try:result=refresh('--prepare' in sys.argv)
    except Exception as e:result={'ok':False,'error':type(e).__name__}
    (ROOT/'runtime/contact-directory-status.json').write_text(json.dumps(result),encoding='utf-8')
    print(json.dumps(result))
