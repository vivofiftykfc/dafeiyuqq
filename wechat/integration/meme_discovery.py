"""Search fixed public catalogs locally; source text never grants tool permission."""
import json,re,time
import httpx
from privacy_policy import ROOT

SOURCES={
 'blue-fish':'https://raw.githubusercontent.com/EDMOK/blue-fish-archive/main/stickers/manifest.json',
 'general':'https://zhaoolee.com/ChineseBQB/catalog/search.json'}

async def discover(query,limit=8):
    cache=ROOT/'runtime/public-meme-catalogs';cache.mkdir(parents=True,exist_ok=True)
    results=[]
    async with httpx.AsyncClient(timeout=30,follow_redirects=False) as client:
        for kind,url in SOURCES.items():
            path=cache/(kind+'.json')
            if not path.exists() or time.time()-path.stat().st_mtime>86400:
                try:
                    response=await client.get(url);response.raise_for_status()
                    if len(response.content)>12000000:continue
                    data=response.json()
                    if not isinstance(data,list):continue
                    path.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
                except Exception:
                    if not path.exists():continue
            for x in json.loads(path.read_text(encoding='utf-8')):
                caption=(x.get('alt','')+' '+x.get('label','')+' '+x.get('categoryTitle','')+' '+' '.join(x.get('tags',[]))).strip()
                tokens=re.findall(r'[a-zA-Z]+|[\u4e00-\u9fff]{1,2}',query)
                score=sum(t.lower() in caption.lower() for t in tokens)
                if not score:continue
                relative=x.get('original') if kind=='blue-fish' else x.get('src')
                if not isinstance(relative,str) or not re.fullmatch(r'(media|memes|stickers)/[\w./-]+\.(png|jpg|jpeg|webp|gif)',relative,re.I) or '..' in relative:continue
                base='https://raw.githubusercontent.com/EDMOK/blue-fish-archive/main/' if kind=='blue-fish' else 'https://zhaoolee.com/ChineseBQB/'
                results.append({'caption':caption,'url':base+relative,'catalog':url,'score':score,'reviewed':False})
    return sorted(results,key=lambda x:x['score'],reverse=True)[:min(limit,20)]
