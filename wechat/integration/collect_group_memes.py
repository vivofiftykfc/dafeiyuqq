"""Backfill a bounded set of already-decoded group images, never other account paths."""
import asyncio,hashlib,json
from privacy_policy import ROOT,GROUP_PEER
from meme_library import collect
async def main():
    vision={}
    for p in (ROOT/'runtime/media/group/vision').glob('*.json'):
        d=json.loads(p.read_text(encoding='utf-8'))
        if d.get('scope')=='group':vision[d['sha256']]=d['description']
    rows=[]
    for p in sorted((ROOT/'runtime/media/group/incoming').glob('*.jpg'),key=lambda x:x.stat().st_mtime,reverse=True)[:12]:
        meta=p.with_suffix('.metadata.json')
        if not meta.exists():continue
        m=json.loads(meta.read_text(encoding='utf-8'))
        if m.get('chat_id')!=GROUP_PEER:continue
        raw=p.read_bytes();description=vision.get(hashlib.sha256(raw).hexdigest())
        if not description:continue
        try:identity=await collect(raw,'group',description,'wechat-group:'+GROUP_PEER,m.get('event_id',''));rows.append({'event':m.get('event_id'),'added':identity})
        except Exception as e:rows.append({'event':m.get('event_id'),'error':type(e).__name__})
    (ROOT/'runtime/group-meme-backfill.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(rows,ensure_ascii=False))
if __name__=='__main__':asyncio.run(main())
