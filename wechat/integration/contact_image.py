"""Extra-contact images: exact attachment identity and direct pixels only."""
import asyncio,hashlib,xml.etree.ElementTree as ET
from urllib.parse import urlparse
from contact_scope import media_scope
from visual_preview import save

async def receive(event):
    media_scope(event['chat_id'],event['sender_id'])
    xml=event['xml']
    if len(xml)>1000000 or '<!DOCTYPE' in xml.upper() or '<!ENTITY' in xml.upper():raise ValueError('Invalid image XML')
    node=ET.fromstring(xml[xml.index('<'):]);emoji=node.find('emoji')
    if emoji is not None:
        import httpx
        url=emoji.get('cdnurl','');parsed=urlparse(url);host=(parsed.hostname or '').lower()
        if parsed.scheme not in ('http','https') or parsed.username or parsed.password or parsed.port not in (None,80,443) or not any(host==d or host.endswith('.'+d) for d in ('qpic.cn','qq.com','weixin.qq.com')):raise ValueError('Sticker host rejected')
        expected=emoji.get('md5','').lower()
        if len(expected)!=32:raise ValueError('Sticker identity missing')
        raw=bytearray()
        async with httpx.AsyncClient(timeout=40,follow_redirects=False,trust_env=False) as client:
            async with client.stream('GET',url) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    raw.extend(chunk)
                    if len(raw)>16*1024*1024:raise ValueError('Sticker too large')
        if hashlib.md5(raw).hexdigest()!=expected:raise ValueError('Sticker hash mismatch')
        detail='sticker'
    else:
        from incoming_image import resolve
        for attempt in range(30):
            try:
                path=await asyncio.to_thread(resolve,event);raw=path.read_bytes();break
            except FileNotFoundError:
                if attempt==29:raise
                await asyncio.sleep(2)
        detail='message-verified-image'
    media_scope(event['chat_id'],event['sender_id'])
    await asyncio.to_thread(save,bytes(raw),event,detail)
    return event['event_id']
