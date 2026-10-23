"""Bounded public collection: no login, no posting, no cookie access."""
import asyncio,json,time
from urllib.parse import urlparse
import httpx
from privacy_policy import ROOT,GROUP_PEER
from media_core import describe
from meme_library import collect,connect
from meme_discovery import discover

async def download(c,url):
    u=urlparse(url)
    if u.scheme!='https' or u.username or u.password or u.port not in (None,443):raise ValueError('Bad URL')
    if not any((u.hostname or '')==d or (u.hostname or '').endswith('.'+d) for d in ('hdslb.com','zhaoolee.com','raw.githubusercontent.com')):raise ValueError('Source host rejected')
    async with c.stream('GET',url) as r:
        r.raise_for_status();raw=bytearray()
        async for chunk in r.aiter_bytes():
            raw.extend(chunk)
            if len(raw)>8*1024*1024:raise ValueError('Image too large')
    return bytes(raw)

async def refresh(force=False):
    state=ROOT/'runtime/meme-collection-health.json'
    old=json.loads(state.read_text(encoding='utf-8')) if state.exists() else {}
    if not force and time.time()-old.get('attempt',0)<21600:return old
    report={'attempt':time.time(),'added':[],'errors':[],'sources':{}}
    state.write_text(json.dumps(report),encoding='utf-8')
    with connect() as db:known={r[0] for r in db.execute('SELECT source FROM memes')}
    items=[]
    async with httpx.AsyncClient(timeout=30,follow_redirects=False,trust_env=False,headers={'User-Agent':'Mozilla/5.0','Referer':'https://www.bilibili.com/'}) as c:
        try:
            r=await c.get('https://api.bilibili.com/x/emote/package?ids=1&business=reply');r.raise_for_status();d=r.json()
            if d.get('code')!=0:raise ValueError('Public API unavailable')
            for pack in (d.get('data') or {}).get('packages') or []:
                if pack.get('id')!=1:continue # Built-in public small faces only; no purchased packs.
                for x in pack.get('emote',[]) or []:
                    url=x.get('url','').replace('http://','https://',1)
                    if url and url not in known:items.append((url,'B站公开表情 '+x.get('text','')))
            report['sources']['bilibili']=len(items)
            if not items:report['sources']['bilibili_status']='no_new_public_items'
        except Exception as e:report['errors'].append('bilibili:'+type(e).__name__)
        try:
            found=await discover('可爱 开心 无语 猫',8)
            extra=[(x['url'],x['caption']) for x in found if x['url'] not in known]
            report['sources']['public_catalog']=len(extra)
        except Exception as e:extra=[];report['errors'].append('catalog:'+type(e).__name__)
        for url,label in items[:6]+extra[:4]:
            try:
                raw=await download(c,url)
                evidence=await describe(GROUP_PEER,'public-source',raw,'描述这张公开表情的画面、文字和情绪；不要根据标题猜。')
                identity=await collect(raw,'public',evidence['description'],url)
                if identity:report['added'].append(identity)
            except Exception as e:report['errors'].append(type(e).__name__)
    report['finished']=time.time();state.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');return report

if __name__=='__main__':
    import sys
    print(json.dumps(asyncio.run(refresh('--force' in sys.argv)),ensure_ascii=False))
