import hashlib,json,datetime
from pathlib import Path
root=Path(__file__).resolve().parent
manifest=json.loads((root/'download-manifest.json').read_text())
total=0
for model, spec in manifest.items():
    for f in spec['files']:
        file=root/'models'/model/f['name']
        assert file.stat().st_size==f['size'],str(file)+' size mismatch'
        if f['sha256']:
            with file.open('rb') as stream:
                assert hashlib.file_digest(stream,'sha256').hexdigest()==f['sha256'],str(file)+' hash mismatch'
        total+=f['size']
result={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bytes':total,'revisions':{name:spec['revision'] for name,spec in manifest.items()}}
(root/'models-ready.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result),flush=True)
