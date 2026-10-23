"""Local-only clean generation workflow, independent of existing user workflows."""
import asyncio,json,secrets,time
from pathlib import Path
import httpx
from media_core import generation_spec,scope_for,MEDIA

async def generate(chat_id,prompt,depicts_self=False,timeout=1200):
    scope=scope_for(chat_id)
    from role_state import selected,persona
    role=selected(chat_id)
    if role['avatar'] not in ('小鲸鱼私聊.png','小鲸鱼群聊测试.png'):
        import re
        self_scene=depicts_self or bool(re.search(r'你自己|画你|你的自拍|你在|你穿|你抱|你坐|你站|你拿|你吃|你喝',prompt))
        spec={'prompt':('角色外观依据：'+persona(chat_id)+'。场景：' if self_scene else '')+prompt,'references':[],'depicts_self':self_scene,'backend':'local-comfyui','status':'prepared','role':role['avatar']}
    else:spec=generation_spec(prompt,depicts_self)
    async with httpx.AsyncClient(base_url='http://127.0.0.1:8188',timeout=60,trust_env=False) as client:
        graph={
          '1':{'class_type':'UnetLoaderGGUF','inputs':{'unet_name':'qwen-image-2.1-UC-Q6_K.gguf'}},
          '2':{'class_type':'CLIPLoader','inputs':{'clip_name':'qwen3vl_8b_int8_convrot.safetensors','type':'qwen_image','device':'default'}},
          '3':{'class_type':'VAELoader','inputs':{'vae_name':'qwen_image_2.1_vae_bf16.safetensors'}},
          '4':{'class_type':'TextEncodeQwenImage21','inputs':{'clip':['2',0],'vae':['3',0],'prompt':spec['prompt'],'negative_prompt':'blurry, deformed hands, extra limbs, watermark, nude, sexual content','resolution':512}},
          '5':{'class_type':'KSampler','inputs':{'model':['1',0],'seed':secrets.randbelow(2**32),'steps':20,'cfg':1.0,'sampler_name':'euler','scheduler':'simple','positive':['4',0],'negative':['4',1],'latent_image':['4',2],'denoise':1.0}},
          '6':{'class_type':'VAEDecode','inputs':{'samples':['5',0],'vae':['3',0]}},
          '7':{'class_type':'SaveImage','inputs':{'images':['6',0],'filename_prefix':'dafeiyu/'+scope+'/image'}}}
        for n,path in enumerate(spec['references'],1):
            p=Path(path)
            r=await client.post('/upload/image',files={'image':(p.name,p.read_bytes(),'image/png')},data={'type':'input','subfolder':'dafeiyu-identity','overwrite':'true'})
            r.raise_for_status();upload=r.json();node=str(10+n)
            graph[node]={'class_type':'LoadImage','inputs':{'image':upload['subfolder']+'/'+upload['name']}}
            graph['4']['inputs']['images.image_'+str(n)]=[node,0]
        r=await client.post('/prompt',json={'prompt':graph});r.raise_for_status();job=r.json()['prompt_id']
        dest=MEDIA/scope/'generated';dest.mkdir(parents=True,exist_ok=True)
        (dest/(job+'.json')).write_text(json.dumps({'spec':spec,'job':job,'status':'submitted'},ensure_ascii=False,indent=2),encoding='utf-8')
        deadline=time.monotonic()+timeout
        while time.monotonic()<deadline:
            r=await client.get('/history/'+job);r.raise_for_status();history=r.json().get(job)
            if history:
                if history.get('status',{}).get('status_str')=='error':raise RuntimeError('Local generation failed; inspect scoped job '+job)
                outputs=history.get('outputs',{}).get('7',{}).get('images',[])
                if outputs:
                    r=await client.get('/view',params=outputs[0]);r.raise_for_status()
                    path=dest/(job+'.png');path.write_bytes(r.content)
                    (dest/(job+'.json')).write_text(json.dumps({'spec':spec,'job':job,'status':'completed','path':str(path)},ensure_ascii=False,indent=2),encoding='utf-8')
                    return path
            await asyncio.sleep(3)
        raise TimeoutError('Generation still pending; do not resubmit automatically: '+job)

if __name__=='__main__':
    from privacy_policy import PRIVATE_PEER
    print(asyncio.run(generate(PRIVATE_PEER,'大肥鱼坐在窗边抱着蓝色鲸鱼玩偶打瞌睡，温馨日常，单人插画，不要六视图',True)))
