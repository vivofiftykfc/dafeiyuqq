"""Public Bilibili link -> bounded content evidence, never a full-view claim."""
import datetime,re,json
from urllib.parse import urlsplit,parse_qs,urljoin
import httpx
from public_video_reader import enrich
from privacy_policy import ROOT,PRIVATE_PEER

async def enrich_remote(item,target):
    """All live readers use the media process's per-video lock and timeout."""
    if not item['id'].startswith('bili:'):return dict(item,reading_status='hotword_only')
    token=json.loads((ROOT/'runtime/owner-ops.json').read_text(encoding='utf-8'))['token']
    try:
        async with httpx.AsyncClient(timeout=40,trust_env=False) as client:
            response=await client.post('http://127.0.0.1:18005/public-video',headers={'Authorization':'Bearer '+token},json={'chat_id':target,'sender_id':PRIVATE_PEER,'url':item['url'],'timeout_seconds':35});response.raise_for_status();data=response.json()
        return {**item,**data}
    except (httpx.HTTPError,ValueError):return dict(item,reading_status='content_unavailable',content_evidence='',limitations='The bounded content read failed; only the title and description are known')

def bvid_from_url(value):
    if not isinstance(value,str) or len(value)>2048:raise ValueError('Invalid video URL')
    if re.fullmatch(r'BV[0-9A-Za-z]{10}',value):return value
    parsed=urlsplit(value)
    if parsed.scheme!='https' or parsed.hostname not in ('www.bilibili.com','bilibili.com','m.bilibili.com') or parsed.username or parsed.password or parsed.port not in (None,443):raise ValueError('Only public Bilibili video URLs are supported')
    if any(part!='1' for part in parse_qs(parsed.query).get('p',[])):raise ValueError('Only the first video part is supported; not silently reading another part')
    match=re.fullmatch(r'/video/(BV[0-9A-Za-z]{10})/?',parsed.path)
    if not match:raise ValueError('A specific Bilibili BV video link is required')
    return match[1]

async def canonical_bvid(value):
    parsed=urlsplit(value)
    if parsed.hostname=='b23.tv':
        if parsed.scheme!='https' or parsed.username or parsed.password or parsed.port not in (None,443) or not re.fullmatch(r'/[a-zA-Z0-9]{3,24}/?',parsed.path):raise ValueError('Invalid Bilibili short link')
        async with httpx.AsyncClient(timeout=8,trust_env=False,follow_redirects=False) as client:
            response=await client.get('https://b23.tv'+parsed.path)
            if response.status_code not in (301,302,303,307,308):raise ValueError('Short link did not resolve to a public video')
            value=urljoin('https://b23.tv'+parsed.path,response.headers.get('location',''))
    return bvid_from_url(value)

async def read_video(value,target):
    bvid=await canonical_bvid(value)
    async with httpx.AsyncClient(timeout=12,trust_env=False,follow_redirects=False,headers={'User-Agent':'Mozilla/5.0','Referer':'https://www.bilibili.com/'}) as client:
        response=await client.get('https://api.bilibili.com/x/web-interface/view',params={'bvid':bvid});response.raise_for_status();body=response.json()
    data=body.get('data')
    if body.get('code')!=0 or not isinstance(data,dict) or data.get('bvid',bvid)!=bvid:raise RuntimeError('Public video metadata unavailable')
    item={'id':'bili:'+bvid,'source':'B站公开视频','url':'https://www.bilibili.com/video/'+bvid,'title':str(data.get('title',''))[:180],'description':str(data.get('desc',''))[:3000],'duration':data.get('duration',0),'published':data.get('pubdate',0)}
    evidence=await enrich(item,target)
    return {key:evidence[key] for key in ('id','source','url','title','description','duration','reading_status','content_evidence','audio_transcript','coverage','limitations') if key in evidence}|{'status':'content_read' if evidence.get('content_evidence') else 'metadata_only','watched_entire_video':False,'fetched_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
