"""Public share identity and embedded-data parsing; never labels metadata as viewing.

SSR format reference: https://github.com/ucmao/media-parser/blob/main/docs/parsers/douyin.md
No cookies, signature generation, login, watermark removal or third-party gateway.
"""
import json,re
from urllib.parse import urlsplit,urljoin
import httpx

HOSTS={'v.douyin.com','www.douyin.com','douyin.com','www.iesdouyin.com','iesdouyin.com'}

def checked(value):
    if not isinstance(value,str) or len(value)>2048:raise ValueError('Invalid public share URL')
    parsed=urlsplit(value)
    if parsed.scheme!='https' or parsed.hostname not in HOSTS or parsed.username or parsed.password or parsed.port not in (None,443):raise ValueError('Only public HTTPS Douyin share links are accepted')
    return parsed

def identity(value):
    parsed=checked(value)
    match=re.fullmatch(r'/(?:share/)?(note|video)/(\d{15,20})/?',parsed.path)
    if not match:return None
    kind,post=match.groups()
    return {'id':'douyin:'+post,'post_id':post,'kind':kind,'url':'https://www.douyin.com/'+kind+'/'+post}

async def resolve(value,client=None):
    if client is None:
        async with httpx.AsyncClient(timeout=8,trust_env=False,follow_redirects=False) as owned:return await resolve(value,owned)
    for _ in range(4):
        direct=identity(value)
        if direct:return direct
        parsed=checked(value)
        if parsed.hostname!='v.douyin.com' or not re.fullmatch(r'/[a-zA-Z0-9_-]{3,32}/?',parsed.path):raise ValueError('A specific public note/video share link is required')
        async with client.stream('GET','https://v.douyin.com'+parsed.path,headers={'User-Agent':'Mozilla/5.0'}) as response:
            if response.status_code not in (301,302,303,307,308):raise ValueError('Public share link did not resolve to a work')
            value=urljoin(value,response.headers.get('location',''))
    raise ValueError('Too many public share redirects')

def image_url(value):
    try:
        parsed=urlsplit(value)
        if parsed.scheme!='https' or parsed.username or parsed.password or parsed.port not in (None,443):return False
        return any(parsed.hostname and parsed.hostname.endswith('.'+host) for host in ('douyinpic.com','byteimg.com'))
    except (ValueError,TypeError):return False

def embedded_item(html,post_id):
    if not isinstance(html,str) or len(html)>2*1024*1024 or not re.fullmatch(r'\d{15,20}',post_id):raise ValueError('Invalid bounded share page')
    match=re.search(r'(?:window\.)?_ROUTER_DATA\s*=\s*',html)
    if not match:return None
    try:data,_=json.JSONDecoder().raw_decode(html[match.end():])
    except (ValueError,RecursionError):return None
    todo=[data];found=[];visited=0
    while todo:
        node=todo.pop();visited+=1
        if visited>20000:raise ValueError('Share data exceeds node budget')
        if isinstance(node,dict):
            if str(node.get('aweme_id',''))==post_id and ('desc' in node or 'images' in node):found.append(node)
            todo.extend(node.values())
        elif isinstance(node,list):todo.extend(node)
    if not found:return None  # HTTP 200 with router data can still be only a page shell.
    item=max(found,key=lambda row:len(row.get('images') or []));images=[]
    for image in (item.get('images') or [])[:64]:
        if not isinstance(image,dict):continue
        urls=image.get('url_list') or (image.get('display_image') or {}).get('url_list') or []
        url=next((url for url in urls if isinstance(url,str) and len(url)<=4096 and image_url(url)),None)
        if url:images.append(url)
    return {'post_id':post_id,'description':str(item.get('desc',''))[:3000],'author':str((item.get('author') or {}).get('nickname',''))[:160],
            'image_urls':images,'image_total':len(item.get('images') or []),'reading_status':'metadata_only','content_evidence':'',
            'untrusted_content':True,'limitations':'Embedded metadata and image addresses only. No image has been read and no full-work viewing is established.'}
