"""Read-only, explicitly bound alt SNS/media reader using wechatapi's DB codec.

Reuses vendor/wechatapi (Apache-2.0). Never auto-selects an account or scans
processes in ordinary reads. Preparation may read only the verified bound PID.
"""
import importlib.util,json,sys,xml.etree.ElementTree as ET
from pathlib import Path
from privacy_policy import ROOT
ACCOUNT=Path('__WECHAT_DATA_ROOT__/wxid_example')
sys.path.append(str(ROOT/'runtime/MaiBot/.venv/Lib/site-packages'))

def reader(prepare=False,media=False):
    if prepare:
        from wechat_native_probe import probe
        verified=probe()
        if verified['profile']['wxid']!='wxid_bot':raise ValueError('Wrong account')
    spec=importlib.util.spec_from_file_location('bound_social_codec',ROOT/'vendor/wechatapi/wechatauto/db.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    class BoundSocial(module.WeChatDB):
        def _collect_db_files(self):
            storage=ACCOUNT/'db_storage'
            files=[] if media else [storage/'sns/sns.db']
            if prepare or media:files.extend(sorted((storage/'message').glob('media_*.db')))
            return [(p.relative_to(storage).as_posix(),str(p),p.stat().st_size) for p in files if p.is_file()]
        def _find_weixin_pids(self):
            if not prepare:raise RuntimeError('Ordinary SNS/media reads cannot inspect processes')
            return [verified['pid']]
        def _auto_diagnose_key_failure(self,rel):raise RuntimeError('Bound SNS/media index requires preparation')
        def _load_or_extract_keys(self,master_key=None):
            if prepare:return super()._load_or_extract_keys(master_key)
            saved=json.loads(Path(self.keys_file).read_text(encoding='utf-8'))
            self._keys={rel:bytes.fromhex(saved[rel]) for rel,_,_ in self._db_files if rel in saved}
            if any(rel not in self._keys or not self._key_works(rel) for rel,_,_ in self._db_files):raise RuntimeError('Bound SNS/media index unavailable')
    return BoundSocial(db_dir=str(ACCOUNT.parent),account=ACCOUNT.name,keys_file=str(ROOT/'local/wechat-social-key.json'),workdir=str(ROOT/'runtime/wechat-social-index'))

def parse_moment(content,tid,author):
    if isinstance(content,bytes):content=content.decode('utf-8',errors='strict')
    if not isinstance(content,str) or len(content)>1024*1024 or '<!DOCTYPE' in content.upper() or '<!ENTITY' in content.upper():raise ValueError('Invalid SNS XML')
    node=ET.fromstring(content)
    text=node.findtext('.//contentDesc') or ''
    return {'id':str(tid),'author':author,'text':text[:10000],'created':node.findtext('.//createTime'),'media_count':len(node.findall('.//mediaList/media')),'source':'bound_alt_local_sns_cache','untrusted_content':True}

def moments(limit=5):
    if isinstance(limit,bool) or not isinstance(limit,int) or not 1<=limit<=10:raise ValueError('Moments limit must be 1-10')
    db=reader();connection=db._open('sns/sns.db')
    try:
        rows=connection.execute('SELECT tid,user_name,content FROM SnsTimeLine ORDER BY tid DESC LIMIT ?',(limit,)).fetchall()
        result=[]
        for row in rows:
            try:result.append(parse_moment(row['content'],row['tid'],row['user_name']))
            except (ValueError,UnicodeError,ET.ParseError):continue
        return {'account':'wxid_bot','local_cached_only':True,'items':result,'publishing_supported':False,'like_comment_supported':False,'network_refresh':False}
    finally:connection.close()

if __name__=='__main__':
    if '--prepare' in sys.argv:
        try:
            db=reader(prepare=True);connection=db._open('sns/sns.db')
            try:count=connection.execute('SELECT count(*) FROM SnsTimeLine').fetchone()[0]
            finally:connection.close()
            report={'state':'ready','account':'wxid_bot','cached_moments':count,'databases':[row[0] for row in db._db_files],'main_account_accessed':False,'injected':False}
        except Exception as error:report={'state':'failed','error_type':type(error).__name__,'main_account_accessed':False,'injected':False}
        (ROOT/'runtime/wechat-social-index-status.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False))
    else:print(json.dumps(moments(int(sys.argv[1]) if len(sys.argv)>1 else 5),ensure_ascii=False))
