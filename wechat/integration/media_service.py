"""Authenticated preparation API; native image transmission is deliberately separate."""
import asyncio,base64,hmac,json
from pathlib import Path
from fastapi import FastAPI,Header,HTTPException
from pydantic import BaseModel,Field
import uvicorn
from privacy_policy import ROOT,PRIVATE_PEER,GROUP_PEER
from media_core import describe,select_meme,scope_for
from comfy_media import generate
from meme_discovery import discover

app=FastAPI();draw_lock=asyncio.Lock()
collection_jobs=set()
collection_queue=None

def review_queue():
    global collection_queue
    if collection_queue is None:
        from collection_queue import CollectionQueue
        collection_queue=CollectionQueue(ROOT/'runtime/collection-review.sqlite')
    return collection_queue

def pump_collection():
    from meme_library import collect
    queue=review_queue()
    while len(collection_jobs)<2:
        item=queue.claim()
        if not item:break
        async def work(row=item):
            try:
                description=row['description']
                if description.startswith('[DSH原图直读待分析]'):
                    target=PRIVATE_PEER if row['origin']=='private' else GROUP_PEER
                    observed=await describe(target,PRIVATE_PEER,row['raw'],'提取关键画面、文字和可能的梗义，用于后台表情收藏筛选；不要推测发送者。')
                    description=observed['description']
                result=await collect(row['raw'],row['origin'],description,row['source'],row['event'])
                queue.finish(row['id'],result)
            except asyncio.CancelledError:
                raise  # running is recovered from durable storage on restart
            except Exception as exc:
                import logging
                queue.fail(row['id'],exc)
                logging.exception('Meme review deferred; vision remains available')
        task=asyncio.create_task(work());collection_jobs.add(task);task.add_done_callback(collection_jobs.discard)

def queue_collection(raw,result,event):
    target=event['chat_id']
    if target not in (PRIVATE_PEER,GROUP_PEER):return
    if target==PRIVATE_PEER and event.get('sender_id')!=PRIVATE_PEER:return
    origin='private' if target==PRIVATE_PEER else 'group'
    identity=review_queue().enqueue(raw,result['description'],origin,'wechat-'+origin+':'+target,event['event_id'])
    pump_collection()
    return identity

@app.on_event('startup')
async def start_collection():
    from voice_paths import audio_dir
    audio_dir('group')
    async def drain():
        while True:
            pump_collection()
            await asyncio.sleep(2)
    app.state.review_task=asyncio.create_task(drain())
    async def loop():
        import logging
        from collect_public_memes import refresh
        while True:
            await asyncio.sleep(60)
            try:await refresh()
            except Exception:logging.exception('Public meme refresh unavailable')
            await asyncio.sleep(3540)
    app.state.collection_task=asyncio.create_task(loop())

@app.on_event('shutdown')
async def stop_collection():
    app.state.review_task.cancel()
    await asyncio.gather(app.state.review_task,return_exceptions=True)
    app.state.collection_task.cancel()
    await asyncio.gather(app.state.collection_task,return_exceptions=True)
    if collection_jobs:await asyncio.gather(*list(collection_jobs),return_exceptions=True)
class MediaRequest(BaseModel):
    chat_id:str
    sender_id:str
    text:str=Field(default='',max_length=2000)
    image_base64:str=Field(default='',max_length=23000000)
    depicts_self:bool=False
    character:str|None=Field(default=None,max_length=200)
    job_id:str|None=Field(default=None,max_length=200)

class IncomingRequest(BaseModel):
    chat_id:str
    sender_id:str
    event_id:str=Field(max_length=128)
    xml:str=Field(max_length=65536)
    received:float

async def incoming_evidence(raw,event,detail,question):
    """Decode/index here; DSH chat consumes pixels without an API-caption prerequisite."""
    from visual_preview import save as save_preview
    from image_animation import inspect
    save_preview(raw,event,detail)
    scope=scope_for(event['chat_id'])
    cfg=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'))
    if scope in cfg.get('enabled_scopes',[]) and cfg.get('generation_backends',{}).get(scope)=='dsh':
        animation,frames=inspect(raw,samples=True)
        result={'scope':scope,'description':'[DSH原图直读待分析] 图片已解码并核验来源；这不是内容摘要。直接依据本轮附带像素回应；未附图时不能声称看见。',
                'backend':'dsh-native-attachment','image_media':animation,'sampled_frames':len(frames)}
    else:
        result=await describe(event['chat_id'],event['sender_id'],raw,question)
    result.update(detail=detail,visual_event_id=event['event_id'])
    collection=queue_collection(raw,result,event)
    if collection:result['collection_status']='queued'
    return result

@app.post('/incoming')
async def incoming(req:IncomingRequest,authorization:str=Header(default='')):
    authorize(req,authorization)
    from incoming_image import resolve
    import xml.etree.ElementTree as ET
    from urllib.parse import urlparse
    import hashlib,httpx
    event=req.model_dump()
    if '<!DOCTYPE' in req.xml.upper() or '<!ENTITY' in req.xml.upper():raise HTTPException(400,'XML entities forbidden')
    xml=ET.fromstring(req.xml[req.xml.index('<'):])
    emoji=xml.find('emoji')
    if emoji is not None:
        url=emoji.get('cdnurl','')
        parsed=urlparse(url)
        if parsed.scheme not in ('http','https') or parsed.username or parsed.password or parsed.port not in (None,80,443):raise HTTPException(400,'Invalid sticker URL')
        host=(parsed.hostname or '').lower()
        if not any(host==d or host.endswith('.'+d) for d in ('qpic.cn','qq.com','weixin.qq.com')):raise HTTPException(400,'Sticker host rejected')
        async with httpx.AsyncClient(timeout=40,follow_redirects=False,trust_env=False) as client:
            async with client.stream('GET',url) as response:
                response.raise_for_status();raw=bytearray()
                async for chunk in response.aiter_bytes():
                    raw.extend(chunk)
                    if len(raw)>16*1024*1024:raise HTTPException(413,'Sticker too large')
        expected=emoji.get('md5','').lower()
        if expected and hashlib.md5(raw).hexdigest()!=expected:raise HTTPException(422,'Sticker hash mismatch')
        return await incoming_evidence(bytes(raw),event,'sticker-sampled-frames','提取表情包关键文字、画面和可能梗义，事实和推断分开。')
    path=None
    for attempt in range(30):
        try:path=await asyncio.to_thread(resolve,event);break
        except FileNotFoundError:
            if attempt==29:raise HTTPException(422,'Image cache not matched; no substitution')
            await asyncio.sleep(2)
    if path is None:raise HTTPException(422,'No verified image')
    meta=json.loads(path.with_suffix('.metadata.json').read_text())
    detail=meta['detail']
    return await incoming_evidence(path.read_bytes(),event,detail,'提取微信图片关键文字和画面，梗义与事实分开。清晰度：'+detail)

def authorize(req,header,owner=False):
    secret=json.loads((ROOT/'runtime/owner-ops.json').read_text())['token']
    if not hmac.compare_digest(header,'Bearer '+secret):raise HTTPException(401,'Unauthorized')
    try:scope=scope_for(req.chat_id)
    except ValueError:raise HTTPException(403,'Unknown conversation')
    if not req.sender_id or ((owner or scope=='private') and req.sender_id!=PRIVATE_PEER):raise HTTPException(403,'Sender rejected')

@app.get('/health')
async def health():return {'service':'dafeiyu-media','vision':'dsh-native-attachment','background_vision':'dsh-sdk','generation':'local-comfyui','incoming_revision':4,'group_media_revision':3,'native_image_transport':True,'collection_active':len(collection_jobs),'collection_queue':review_queue().counts(),'offline_asr':json.loads((__import__('voice_paths').VOICE_ROOT/'asr.json').read_text(encoding='utf-8-sig'))['engine'],'native_voice_transport':False}

@app.post('/describe')
async def vision(req:MediaRequest,authorization:str=Header(default='')):
    authorize(req,authorization)
    try:raw=base64.b64decode(req.image_base64,validate=True)
    except ValueError:raise HTTPException(400,'Invalid image encoding')
    try:return await describe(req.chat_id,req.sender_id,raw,req.text or '描述这张图片')
    except ValueError as exc:raise HTTPException(400,str(exc))

class PublicVideoRequest(MediaRequest):
    url:str=Field(max_length=2048)
    timeout_seconds:int=Field(default=35,ge=5,le=35)

class NativeVideoRequest(MediaRequest):
    video_sender:str=Field(max_length=128)
    server_id:str|None=Field(default=None,max_length=20)
    as_of:float

@app.post('/incoming-video')
async def incoming_video(req:NativeVideoRequest,authorization:str=Header(default='')):
    authorize(req,authorization)
    from native_video_reader import read_native
    try:return await asyncio.wait_for(read_native(chat_id=req.chat_id,sender_id=req.sender_id,video_sender=req.video_sender,server_id=req.server_id,as_of=req.as_of),35)
    except asyncio.TimeoutError:return {'status':'video_read_timed_out','message':'微信视频来源已指定，但读取超时，没有可确认的完整观看','watched_entire_video':False}
    except ValueError as error:raise HTTPException(400,str(error))
    except Exception:raise HTTPException(502,'Bound native video could not be read; do not invent content')

@app.post('/public-video')
async def public_video(req:PublicVideoRequest,authorization:str=Header(default='')):
    authorize(req,authorization)
    from public_video_tool import read_video
    try:return await asyncio.wait_for(read_video(req.url,req.chat_id),req.timeout_seconds)
    except asyncio.TimeoutError:return {'status':'reading_timed_out','content_evidence':'','watched_entire_video':False,'limitations':'This bounded read did not finish; do not claim the content was watched or understood'}
    except ValueError as exc:raise HTTPException(400,str(exc))
    except Exception:raise HTTPException(502,'Public video content unavailable; do not invent it')

class PublicNoteRequest(MediaRequest):
    url:str=Field(max_length=2048)
    timeout_seconds:int=Field(default=65,ge=15,le=75)

@app.post('/public-note')
async def public_note(req:PublicNoteRequest,authorization:str=Header(default='')):
    authorize(req,authorization)
    from public_note_reader import read_note
    try:return await read_note(req.url,req.timeout_seconds)
    except asyncio.TimeoutError:return {'status':'reading_timed_out','content_evidence':'','watched_entire_video':False,'limitations':'图文读取超时，未取得可核对正文；不应推测内容或声称看过'}
    except ValueError as exc:raise HTTPException(400,str(exc))
    except Exception:raise HTTPException(502,'Public image note unavailable; do not invent its content')

@app.post('/memes')
def memes(req:MediaRequest,authorization:str=Header(default='')):
    authorize(req,authorization)
    return {'items':select_meme(req.text),'sent':False,'native_image_transport':True}

@app.post('/generate')
async def draw(req:MediaRequest,authorization:str=Header(default='')):
    authorize(req,authorization,owner=True)
    if not req.text.strip():raise HTTPException(400,'Prompt required')
    if draw_lock.locked():raise HTTPException(429,'A drawing is already running')
    async with draw_lock:
        try:path=await generate(req.chat_id,req.text,req.depicts_self)
        except Exception:raise HTTPException(502,'Local drawing failed or remains pending; inspect job record before retrying')
    return {'path':str(path),'sent':False,'native_image_transport':True}

@app.post('/tts')
async def tts(req:MediaRequest,authorization:str=Header(default='')):
    authorize(req,authorization,owner=req.chat_id!=GROUP_PEER)
    if not req.text.strip():raise HTTPException(400,'Speech text required')
    if req.chat_id==GROUP_PEER:
        from media_actions import active
        from role_state import selected
        jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'))
        job=jobs.get(req.job_id,{})
        try:
            if active(job,selected)!=GROUP_PEER or job.get('avatar')!=req.character:raise ValueError('wrong_role')
        except ValueError:raise HTTPException(403,'Active group role required')
    return await prepare_speech(req)

tts_lock=asyncio.Lock()
async def prepare_speech(req):
    if not req.text.strip() or len(req.text)>1500:raise HTTPException(400,'Speech text must contain 1-1500 characters')
    if tts_lock.locked():raise HTTPException(429,'Local speech synthesis is busy')
    async with tts_lock:return await synthesize_local(req)

async def synthesize_local(req):
    import uuid,wave
    from voice_paths import audio_dir,tts_settings
    folder=audio_dir('private' if req.chat_id==PRIVATE_PEER else 'group')
    folder.mkdir(parents=True,exist_ok=True)
    try:settings=tts_settings(req.character)
    except ValueError:raise HTTPException(400,'Invalid character voice configuration')
    path=folder/(uuid.uuid4().hex+'.wav')
    if settings['engine']=='kokoro':
        if len(req.text)>1500:raise HTTPException(400,'Local voice accepts up to 1500 characters')
        args=[str(__import__('voice_paths').VOICE_ROOT/'venv/Scripts/python.exe'),'-X','utf8',str(ROOT/'integration/kokoro_tts.py'),'--text',req.text,'--out',str(path)]
        if req.character:args+=['--character',req.character]
    else:args=['powershell.exe','-NoProfile','-ExecutionPolicy','Bypass','-File',str(ROOT/'tools/tts.ps1'),'-Text',req.text,'-Out',str(path),'-Voice',settings['voice'],'-Rate',str(settings['rate'])]
    process=await asyncio.create_subprocess_exec(*args,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.DEVNULL,creationflags=0x08000000)
    try:stdout,_=await asyncio.wait_for(process.communicate(),60)
    except (asyncio.TimeoutError,asyncio.CancelledError) as error:
        if process.returncode is None:process.kill();await process.wait()
        path.unlink(missing_ok=True)
        if isinstance(error,asyncio.CancelledError):raise
        raise HTTPException(504,'Local TTS timed out')
    if process.returncode or not path.exists():raise HTTPException(502,'Local TTS failed')
    actual={}
    if settings['engine']=='kokoro':
        try:actual=json.loads(stdout.decode('utf-8'))
        except (ValueError,UnicodeError):raise HTTPException(502,'Local TTS output metadata unavailable')
        if __import__('pathlib').Path(actual.get('path','')).resolve()!=path.resolve() or actual.get('character')!=req.character:raise HTTPException(502,'Local TTS output identity mismatch')
    with wave.open(str(path),'rb') as f:seconds=f.getnframes()/f.getframerate()
    speaker=actual.get('speaker_id',settings.get('speaker_id'))
    prepared={'payload_ready':False,'reason':'duration_exceeds_native_60_seconds' if seconds>60 else 'preparation_failed','native_transport_connected':False,'wechat_sent':False}
    if req.chat_id==PRIVATE_PEER and 0<seconds<=60:
        request={'path':str(path),'character':req.character,'speaker_id':speaker,'engine':settings['engine']}
        codec=None
        try:
            codec=await asyncio.create_subprocess_exec(str(__import__('voice_paths').VOICE_ROOT/'venv/Scripts/python.exe'),'-X','utf8',str(ROOT/'integration/native_voice_payload.py'),json.dumps(request,ensure_ascii=False),stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.DEVNULL,creationflags=0x08000000)
            output,_=await asyncio.wait_for(codec.communicate(),15)
            if codec.returncode or len(output)>16000:raise ValueError('Codec worker failed')
            result=json.loads(output.decode('utf-8'))
            if Path(result.get('wav_path','')).resolve()!=path.resolve() or result.get('character')!=req.character or result.get('target')!=PRIVATE_PEER or result.get('payload_ready') is not True or result.get('native_transport_connected') is not False or result.get('wechat_sent') is not False:raise ValueError('Prepared voice source mismatch')
            prepared={key:result[key] for key in ('payload_ready','voice_time_ms','packet_count','silk_path','silk_sha256','codec_roundtrip_verified','native_transport_connected','wechat_sent')}
        except (asyncio.TimeoutError,ValueError,KeyError,UnicodeError,OSError):
            if codec and codec.returncode is None:codec.kill();await codec.wait()
        except asyncio.CancelledError:
            if codec and codec.returncode is None:codec.kill();await codec.wait()
            raise
    from media_actions import describe_media
    media=describe_media(req.chat_id,path)
    if req.chat_id==GROUP_PEER:prepared['reason']='file_delivery_no_native_voice_payload'
    return {'media_item':{k:v for k,v in media.items() if k not in ('path','sha256')},'path':str(path),'seconds':seconds,'engine':settings['engine'],'speaker_id':speaker,'character':req.character,'voice_source':actual.get('voice_source',settings.get('voice_source','default')),'offline':True,'sent':False,'native_voice_transport':False,'voice_payload':prepared}

@app.post('/tts-diagnostic')
async def tts_diagnostic(req:MediaRequest,authorization:str=Header(default='')):
    """Owner-authenticated service-process probe; fixed text, no send or fake chat."""
    authorize(req,authorization,owner=True)
    if req.chat_id!=GROUP_PEER:raise HTTPException(400,'Group synthesis diagnostic only')
    from role_state import selected
    import os
    probe=MediaRequest(chat_id=GROUP_PEER,sender_id=PRIVATE_PEER,character=selected(GROUP_PEER)['avatar'],text='小鲸鱼本地语音服务检查，音频不会发送到微信。')
    result=await prepare_speech(probe)
    path=Path(result['path'])
    try:
        from media_actions import inventory
        verified=any(x['id']==result['media_item']['id'] for x in inventory(GROUP_PEER))
        return {'service_pid':os.getpid(),'scope':'group','seconds':result['seconds'],'engine':result['engine'],'inventory_verified':verified,'offline':result['offline'],'wechat_sent':False,'diagnostic_file_removed':True}
    finally:path.unlink(missing_ok=True)

class VoiceRequest(MediaRequest):
    audio_base64:str=Field(max_length=12000000)
    audio_format:str='wav'

voice_lock=asyncio.Lock()
@app.post('/transcribe')
async def transcribe_voice(req:VoiceRequest,authorization:str=Header(default='')):
    authorize(req,authorization,owner=True)
    if req.chat_id!=PRIVATE_PEER or req.audio_format not in ('wav','silk'):raise HTTPException(400,'Owner voice format required')
    try:raw=base64.b64decode(req.audio_base64,validate=True)
    except ValueError:raise HTTPException(400,'Invalid voice payload')
    if not 0<len(raw)<=8*1024*1024:raise HTTPException(413,'Voice payload too large')
    valid=(raw.startswith(b'RIFF') and raw[8:12]==b'WAVE') if req.audio_format=='wav' else raw[:16].lstrip(b'\x02').startswith(b'#!SILK_V3')
    if not valid:raise HTTPException(400,'Voice signature mismatch')
    import uuid,os
    from voice_paths import audio_dir
    folder=audio_dir('private' if req.chat_id==PRIVATE_PEER else 'group')
    folder.mkdir(parents=True,exist_ok=True)
    path=folder/(uuid.uuid4().hex+'.'+req.audio_format);path.write_bytes(raw)
    async with voice_lock:
        env=dict(os.environ,HF_HUB_OFFLINE='1',HF_HUB_DISABLE_TELEMETRY='1',PYTHONIOENCODING='utf-8')
        from voice_paths import asr_backend
        python,script,args=asr_backend(path)
        proc=await asyncio.create_subprocess_exec(str(python),'-X','utf8',str(script),*args,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE,env=env,creationflags=0x08000000)
        try:stdout,stderr=await asyncio.wait_for(proc.communicate(),120)
        except (asyncio.TimeoutError,asyncio.CancelledError) as exc:
            killer=await asyncio.create_subprocess_exec('taskkill','/PID',str(proc.pid),'/T','/F',stdout=asyncio.subprocess.DEVNULL,stderr=asyncio.subprocess.DEVNULL,creationflags=0x08000000)
            await killer.wait();await proc.communicate()
            if isinstance(exc,asyncio.CancelledError):raise
            raise HTTPException(504,'Offline ASR timed out')
    if proc.returncode:raise HTTPException(502,'Offline ASR failed; native WeChat voice is not yet connected')
    result=json.loads(stdout);result['path']=str(path)
    return result

@app.post('/discover')
async def search(req:MediaRequest,authorization:str=Header(default='')):
    authorize(req,authorization)
    return {'candidates':await discover(req.text),'sent':False,'requires_visual_review':True}

if __name__=='__main__':uvicorn.run(app,host='127.0.0.1',port=18005,access_log=False)
