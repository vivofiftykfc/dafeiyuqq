"""Scoped media preparation. No UI automation, account switching, or implicit sending."""
import base64,hashlib,io,json,re,uuid
from pathlib import Path
import httpx
from PIL import Image
from privacy_policy import ROOT,PRIVATE_PEER,GROUP_PEER

MEDIA=ROOT/'runtime/media'
CATALOG=ROOT/'assets/memes/catalog.json'

def scope_for(chat_id):
    if chat_id==PRIVATE_PEER:return 'private'
    if chat_id==GROUP_PEER:return 'group'
    raise ValueError('Unknown conversation')

def image_bytes(raw):
    if len(raw)>16*1024*1024:raise ValueError('Image exceeds 16 MiB')
    with Image.open(io.BytesIO(raw)) as im:
        if im.format not in ('PNG','JPEG','WEBP','GIF'):raise ValueError('Unsupported image')
        if im.width*im.height>24000000:raise ValueError('Image too large')
        im.seek(0);im=im.convert('RGB');im.thumbnail((1536,1536))
        out=io.BytesIO();im.save(out,format='JPEG',quality=90)
        return out.getvalue()

async def describe(chat_id,sender_id,raw,question='这张图里有什么？'):
    scope=scope_for(chat_id)
    if not sender_id or (scope=='private' and sender_id!=PRIVATE_PEER):raise ValueError('Sender mismatch')
    normalized=image_bytes(raw)
    from image_animation import inspect as inspect_animation
    animation,frames=inspect_animation(raw,samples=True)
    images=[frame['jpeg'] for frame in frames] if animation['animated'] else [normalized]
    question=question[:2000]+(('\n此文件是动图；下面按时间顺序抽取'+str(len(frames))+'帧：'+json.dumps([{k:f[k] for k in ('frame','time_ms')} for f in frames],ensure_ascii=False)+'。请依据这些采样画面说明变化，不把单帧说成完整动画。') if animation['animated'] else '')
    from dsh_vision import analyze
    description=await analyze(images,question)
    result={'id':uuid.uuid4().hex,'scope':scope,'sender_id':sender_id,'sha256':hashlib.sha256(raw).hexdigest(),'description':description,'backend':'dsh-sdk-native-image','image_media':animation,'sampled_frames':len(images)}
    if animation['animated']:result['description']='【动图采样资料：'+str(len(images))+'帧/共'+str(animation['frames'])+'帧，未逐帧观看】'+result['description']
    directory=MEDIA/scope/'vision';directory.mkdir(parents=True,exist_ok=True)
    (directory/(result['id']+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    return result

def select_meme(query,category=None):
    entries=json.loads(CATALOG.read_text(encoding='utf-8'))['items']
    candidates=[x for x in entries if x.get('reviewed') and (category is None or category in x['categories'])]
    terms=set(re.findall(r'[a-z]+|[\u4e00-\u9fff]{1,2}',query.lower()))
    def score(x):return sum(t in (x['caption']+' '.join(x['tags'])).lower() for t in terms)
    candidates.sort(key=score,reverse=True)
    return candidates if query.strip() in ('大肥鱼 可爱','可爱','大肥鱼') else candidates[:8]

def generation_spec(prompt,depicts_self=False):
    # Caller must explicitly declare self scenes. Also catch common natural references.
    depicts_self=depicts_self or bool(re.search(r'大肥鱼|鲸鱼娘|奥本海羊|你自己|画你|你的自拍|你在|你穿|你抱|你坐|你站|你拿|你吃|你喝|本鱼',prompt))
    identity=json.loads((ROOT/'assets/identity/manifest.json').read_text(encoding='utf-8'))
    references=[]
    if depicts_self:
        for item in identity['references']:
            p=ROOT/item['path']
            if hashlib.sha256(p.read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Identity reference changed')
            references.append(str(p))
        prompt=identity['visual_prompt']+'。场景要求：'+prompt+'。保持参考图同一角色，正常完整着装。'
    return {'prompt':prompt,'depicts_self':depicts_self,'references':references,'backend':'local-comfyui','status':'prepared'}
