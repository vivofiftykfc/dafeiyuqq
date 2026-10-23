"""Anonymous Bilibili evidence: subtitles or sampled frames; never claims full viewing."""
import asyncio,base64,json,re,hashlib,shutil,time
from collections import defaultdict
from urllib.parse import urlparse
from privacy_policy import ROOT,GROUP_PEER,PRIVATE_PEER
import httpx
_locks=defaultdict(asyncio.Lock)

async def audio_evidence(video,folder):
    """Decode a bounded public-video excerpt and transcribe it locally."""
    audio=folder/'audio.wav'
    proc=await asyncio.create_subprocess_exec(shutil.which('ffmpeg'),'-nostdin','-v','error','-y','-i',str(video),'-t','120','-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',str(audio),stdout=asyncio.subprocess.DEVNULL,stderr=asyncio.subprocess.DEVNULL,creationflags=0x08000000)
    try:await asyncio.wait_for(proc.wait(),30)
    except (asyncio.TimeoutError,asyncio.CancelledError):proc.kill();await proc.wait();raise
    if proc.returncode or not audio.exists():return None
    from voice_paths import asr_backend
    python,script,args=asr_backend(audio)
    proc=await asyncio.create_subprocess_exec(str(python),'-X','utf8',str(script),*args,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE,creationflags=0x08000000)
    try:out,err=await asyncio.wait_for(proc.communicate(),120)
    except (asyncio.TimeoutError,asyncio.CancelledError):proc.kill();await proc.communicate();raise
    if proc.returncode:return None
    result=json.loads(out)
    if not result.get('text','').strip():return None
    return {'text':result['text'][:10000],'duration_seconds':result['duration'],'method':result.get('engine','faster-whisper-base'),'limitations':'仅对最多前120秒音轨作自动转写，可能有同音字和漏词；不是逐帧完整观看。'}

async def enrich(item,target):
    async with _locks[item['id']]:return await _enrich(item,target)

async def _enrich(item,target):
    if not item['id'].startswith('bili:'):return dict(item,reading_status='hotword_only')
    bvid=item['id'].split(':',1)[1]
    if not re.fullmatch(r'BV[0-9A-Za-z]+',bvid):return item
    folder=ROOT/'runtime/public-video-evidence'/bvid;folder.mkdir(parents=True,exist_ok=True)
    saved=folder/'evidence.json'
    if saved.exists():
        cached=json.loads(saved.read_text(encoding='utf-8'))
        if cached.get('version')==4 and time.time()-saved.stat().st_mtime<(86400 if cached.get('content_evidence') else 900):
            if str(cached.get('reading_status','')).startswith('sampled_frames'):
                cached['coverage']={**cached.get('coverage',{}),'visual_sampling_span':'distributed_across_whole_source_not_continuous_playback'}
                cached['limitations']='画面为分布于全片的六帧抽样，不是连续播放。音轨若有，仅最多前120秒的自动转写；后半可能有抽样画面但没有后半音轨，不等于连续看了一半或完整看过。'
            return dict(item,**cached)
    evidence={'version':4,'reading_status':'metadata_only','content_evidence':'','limitations':'没有读取到字幕或视频画面，不得声称观看。'}
    try:
        async with httpx.AsyncClient(timeout=35,trust_env=False,follow_redirects=False,headers={'User-Agent':'Mozilla/5.0','Referer':'https://www.bilibili.com/'}) as c:
            r=await c.get('https://api.bilibili.com/x/web-interface/view',params={'bvid':bvid});r.raise_for_status();v=r.json()['data'];cid=v['cid']
            r=await c.get('https://api.bilibili.com/x/player/v2',params={'bvid':bvid,'cid':cid});r.raise_for_status()
            subs=(r.json().get('data') or {}).get('subtitle',{}).get('subtitles',[])
            if subs:
                subtitle=next((x for x in subs if str(x.get('lan','')).startswith(('zh','ai-zh'))),subs[0])
                u=subtitle.get('subtitle_url','');u='https:'+u if u.startswith('//') else u
                host=urlparse(u).hostname or ''
                if urlparse(u).scheme=='https' and (host.endswith('.hdslb.com') or host.endswith('.bilibili.com')):
                    r=await c.get(u);r.raise_for_status()
                    body=r.json().get('body',[])[:400]
                    text='\n'.join(str(x.get('content','')) for x in body)[:16000]
                    if text.strip():evidence.update(reading_status='subtitle_excerpt',content_evidence=text,subtitle_language=subtitle.get('lan'),limitations='读取最多400条、16000字的字幕文本，可能为自动字幕；未验证全部画面，不能说完整看完。')
            # Bound network bytes, subprocess time and sample count, rather than
            # silently excluding ordinary videos just over three minutes.
            if not evidence['content_evidence'] and shutil.which('ffmpeg'):
                r=await c.get('https://api.bilibili.com/x/player/playurl',params={'bvid':bvid,'cid':cid,'qn':16,'fnval':0});r.raise_for_status()
                streams=(r.json().get('data') or {}).get('durl',[])
                if streams:
                    u=streams[0]['url'];parts=urlparse(u);host=parts.hostname or ''
                    if parts.scheme not in ('http','https') or not host.endswith('.bilivideo.com'):raise ValueError('Video host rejected')
                    raw=bytearray()
                    async with c.stream('GET',u) as res:
                        res.raise_for_status()
                        async for block in res.aiter_bytes():
                            raw.extend(block)
                            if len(raw)>40*1024*1024:raise ValueError('Video exceeds 40MB budget')
                    video=folder/'sample.mp4';video.write_bytes(raw)
                    sheet=folder/'frames.jpg';interval=max(1,float(v.get('duration',60))/6)
                    proc=await asyncio.create_subprocess_exec(shutil.which('ffmpeg'),'-nostdin','-v','error','-y','-i',str(video),'-vf',f'fps=1/{interval},scale=480:-1,tile=3x2','-frames:v','1',str(sheet),stdout=asyncio.subprocess.DEVNULL,stderr=asyncio.subprocess.DEVNULL,creationflags=0x08000000)
                    try:await asyncio.wait_for(proc.wait(),45)
                    except (asyncio.TimeoutError,asyncio.CancelledError):proc.kill();await proc.wait();raise
                    if proc.returncode==0 and sheet.exists():
                        try:
                            # Native bridge's environment intentionally has no PIL;
                            # use the same authenticated vision service as incoming images.
                            token=json.loads((ROOT/'runtime/owner-ops.json').read_text(encoding='utf-8'))['token']
                            async with httpx.AsyncClient(timeout=180,trust_env=False) as local:
                                response=await local.post('http://127.0.0.1:18005/describe',headers={'Authorization':'Bearer '+token},json={'chat_id':target,'sender_id':PRIVATE_PEER,'image_base64':base64.b64encode(sheet.read_bytes()).decode(),'text':'这是同一公开视频按时间顺序抽取的六帧，按左到右上到下排列。只描述实际可见动作、字幕和可能的梗；没有声音，不推断完整剧情。'})
                                response.raise_for_status();result=response.json()
                            evidence.update(reading_status='sampled_frames',content_evidence=result['description'],coverage={'source_duration_seconds':v.get('duration'),'sampled_frames_max':6,'visual_sampling_span':'distributed_across_whole_source_not_continuous_playback','audio_read':False},limitations='六帧分布于全片，不是连续播放，未听音频，不保证完整剧情。')
                        except Exception as exc:evidence['vision_error']=type(exc).__name__
                    try:
                        transcript=await audio_evidence(video,folder)
                        if transcript:
                            evidence['audio_transcript']=transcript
                            evidence['coverage']={**evidence.get('coverage',{}),'source_duration_seconds':v.get('duration'),'audio_excerpt_seconds':transcript['duration_seconds'],'audio_read':True}
                            evidence['content_evidence']+='\n音轨自动转写（可能有误）：'+transcript['text']
                            evidence['reading_status']='sampled_frames_and_audio' if sheet.exists() and evidence['reading_status']=='sampled_frames' else 'audio_excerpt'
                            evidence['limitations']='画面若成功，为分布于全片的六帧抽样；音轨仅最多前120秒的自动转写。后半可能有抽样画面但没有后半音轨，不等于连续看了一半或完整看过。不把转写猜词当事实。'
                    except Exception as exc:evidence['audio_error']=type(exc).__name__
                    finally:video.unlink(missing_ok=True)
    except Exception as exc:evidence['error']=type(exc).__name__
    finally:(folder/'sample.mp4').unlink(missing_ok=True)
    temporary=saved.with_suffix('.json.tmp');temporary.write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8');temporary.replace(saved)
    return dict(item,**evidence)
