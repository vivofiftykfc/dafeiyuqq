"""Prepare explicit video evidence before conversational generation."""
import json
import httpx
from privacy_policy import ROOT
from wechat_video_source import select_request

async def for_turn(event):
    request=select_request(event)
    if request is None:return None
    token=json.loads((ROOT/'runtime/owner-ops.json').read_text())['token']
    try:
        async with httpx.AsyncClient(timeout=40,trust_env=False) as client:
            response=await client.post('http://127.0.0.1:18005/incoming-video',headers={'Authorization':'Bearer '+token},json=request)
            response.raise_for_status();result=response.json()
    except (httpx.HTTPError,ValueError):
        result={'status':'video_read_unavailable','message':'当前指向的是微信视频附件，读取暂未成功；不能称为空引用，也不要索要不存在的网页链接','server_id':request.get('server_id'),'video_sender':request['video_sender']}
    result.setdefault('server_id',request.get('server_id'))
    result.setdefault('video_sender',request['video_sender'])
    # Never put paths, attachment credentials or cache identifiers in generation.
    result={key:result[key] for key in ('status','message','server_id','video_sender','reading_status','content_evidence','coverage','duration_seconds','watched_entire_video','requires_native_download') if key in result}
    if 'content_evidence' in result:result['content_evidence']=result['content_evidence'][:9000]
    return result
