"""DSH native multimodal analysis for background indexing and legacy consumers."""
import base64, json, uuid
from dsh_runtime import Runtime, ROOT
from dsh_group_policy import HOST_TOOL_ROWS

async def analyze(images, question):
    folder=ROOT/'runtime/dsh-vision';folder.mkdir(parents=True,exist_ok=True)
    identity=uuid.uuid4().hex
    overlay=folder/(identity+'.patch.json')
    patch=[{'id':name,'disabled':True} for name in HOST_TOOL_ROWS]
    patch += [{'id':'soul-md','disabled':True},
              {'id':'system-prompt','config':{'personaPrefix':'','personaSuffix':''}},
              {'id':'dafeiyu-context','disabled':False,'config':{'visionOnly':True}}]
    overlay.write_text(json.dumps(patch),encoding='utf-8')
    runtime=Runtime(patch=overlay,workspace=folder,model='deepseek-flash')
    try:
        await runtime.start()
        result=await runtime.run('vision-'+identity,question,images=[{'type':'image','data':base64.b64encode(raw).decode(),'mimeType':'image/jpeg'} for raw in images])
        if result['finish_reason']!='completed' or not result['text'].strip():raise RuntimeError('Incomplete DSH visual analysis')
        return result['text']
    finally:
        await runtime.close()
        overlay.unlink(missing_ok=True)
