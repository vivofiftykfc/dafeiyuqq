"""Prepare keys for the bound alt's image index and message attachment metadata."""
import importlib.util
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT/'runtime/MaiBot/.venv/Lib/site-packages'))
from wechat_native_probe import probe

def main():
    status=ROOT/'runtime/image-index-status.json'
    status.write_text(json.dumps({'state':'starting'}),encoding='utf-8')
    verified=probe()
    if verified['profile']['wxid']!='wxid_bot':raise ValueError('Wrong bound account')
    spec=importlib.util.spec_from_file_location('bound_wechat_db',ROOT/'vendor/wechatapi/wechatauto/db.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    class BoundImageIndex(module.WeChatDB):
        def _find_weixin_pids(self):return [verified['pid']]
        def _collect_db_files(self):
            storage=Path(self.account_dir)/'db_storage'
            files=[storage/'hardlink/hardlink.db',*sorted((storage/'message').glob('message_[0-9]*.db'))]
            return [(p.relative_to(storage).as_posix(),str(p),p.stat().st_size) for p in files]
        def _auto_diagnose_key_failure(self,rel):raise RuntimeError('Bound image index key unavailable')
    cache=ROOT/'runtime/image-index';cache.mkdir(parents=True,exist_ok=True)
    db=BoundImageIndex(db_dir='__WECHAT_DATA_ROOT__',
        account='wxid_example',keys_file=str(ROOT/'local/image-hardlink-key.json'),workdir=str(cache))
    connection=db._open('hardlink/hardlink.db')
    schema={name:[x[1] for x in connection.execute('PRAGMA table_info("'+name.replace('"','""')+'")')]
            for name, in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    connection.close()
    for rel,_,_ in db._db_files:
        if rel.startswith('message/'):db._open(rel).close()
    status.write_text(json.dumps({'state':'ready','account':verified['profile']['wxid'],'pid':verified['pid'],'schema':schema,'indexed_databases':[x[0] for x in db._db_files]}),encoding='utf-8')

if __name__=='__main__':
    try:main()
    except Exception as error:
        (ROOT/'runtime/image-index-status.json').write_text(json.dumps({'state':'failed','error':type(error).__name__}),encoding='utf-8')
        raise SystemExit(1)
