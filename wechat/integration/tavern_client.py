"""SillyTavern native browser worker queue; no direct model calls."""
import asyncio,json,time
from pathlib import Path
import httpx
ROOT=Path(__file__).resolve().parents[1]
def enabled(scope):
 p=ROOT/'local/tavern.json'
 return p.exists() and scope in json.loads(p.read_text(encoding='utf-8')).get('enabled_scopes',[])
class GeneratedReply(str):
 def __new__(cls,job):
  value=super().__new__(cls,job['result']);value.job_id=job['id'];value.bubbles=job.get('bubbles');value.plan=job.get('plan');return value

async def generate(event_id,text,scope='private',sender='主人',turn_context='',kind='chat',require_receipt=False,evaluation_session=None,visual_event_id=None,video_evidence=None,sender_id=None):
 if not evaluation_session and scope in ('private','group'):
  from privacy_policy import PRIVATE_PEER,GROUP_PEER
  from wechat_native_probe import EXPECTED
  from unified_chat_memory import context
  turn_context=context(EXPECTED,PRIVATE_PEER if scope=='private' else GROUP_PEER,include_recent=False,query=text)+turn_context
 token=json.loads((ROOT/'runtime/owner-ops.json').read_text(encoding='utf-8'))['token']
 async with httpx.AsyncClient(base_url='http://127.0.0.1:18020',timeout=20,trust_env=False) as c:
  csrf=(await c.get('/csrf-token')).json()['token'];c.headers.update({'X-CSRF-Token':csrf,'Authorization':'Bearer '+token})
  for attempt in range(15):
   status=await c.post('/api/plugins/dafeiyu/status',json={});status.raise_for_status()
   if status.json()['ready']:break
   await asyncio.sleep(1)
  else:raise RuntimeError('SillyTavern browser worker offline')
  r=await c.post('/api/plugins/dafeiyu/submit',json={'id':event_id,'text':text,'scope':scope,'sender':sender,'senderId':sender_id,'turnContext':turn_context,'kind':kind,'requireReceipt':require_receipt,'evaluationSession':evaluation_session,'visualEvent':visual_event_id,'nativeVideo':video_evidence});r.raise_for_status()
  for _ in range(150):
   r=await c.post('/api/plugins/dafeiyu/result',json={'id':event_id});r.raise_for_status();job=r.json()
   if job['state']=='done':return GeneratedReply(job)
   if job['state'] in ('failed','uncertain'):raise RuntimeError('SillyTavern generation '+job['state'])
   await asyncio.sleep(1)
  raise TimeoutError('SillyTavern job result unknown; no automatic retry')


def contextual_text(text, recent):
 """ST owns dialogue history; never replay intercepted commands as conversation."""
 return text


async def role_command(scope,text):
 async with httpx.AsyncClient(base_url='http://127.0.0.1:18020',timeout=15,trust_env=False) as c:
  c.headers['X-CSRF-Token']= (await c.get('/csrf-token')).json()['token']
  data=(await c.post('/api/plugins/dafeiyu/cards',json={})).json()
  if text=='/角色':
   return '当前'+('私聊' if scope=='private' else '工作群')+'角色：'+data['roles'].get(scope,{}).get('name','小鲸鱼')+'\n可选：'+'、'.join(x['name'] for x in data['cards'])+'\n切换：/角色 角色名（同名时使用完整文件名）'
  name=text[4:].strip();matches=[x for x in data['cards'] if name in (x['name'],x['avatar'])]
  if len(matches)!=1:return '没找到唯一角色，请用 /角色 查看列表；同名请用完整文件名。'
  r=await c.post('/api/plugins/dafeiyu/role',json={'scope':scope,'avatar':matches[0]['avatar']})
  if r.status_code==409:return '还有消息正在处理，等回复完成再切换。'
  r.raise_for_status();return '已切换为 '+matches[0]['name']+'，这个会话会使用该角色自己的聊天记录。'

async def runtime_event(target, instruction, evidence):
 """A runtime event uses the selected ST character, never a fabricated user turn."""
 import uuid
 scope='private' if target=='wxid_owner' else 'group'
 return await generate('runtime:'+uuid.uuid4().hex, '', scope, turn_context=json.dumps(evidence,ensure_ascii=False),kind='runtime:'+instruction)

async def confirm_delivery(event_id, delivered, text=None):
 token=json.loads((ROOT/'runtime/owner-ops.json').read_text(encoding='utf-8'))['token']
 async with httpx.AsyncClient(base_url='http://127.0.0.1:18020',timeout=15,trust_env=False) as c:
  c.headers.update({'X-CSRF-Token':(await c.get('/csrf-token')).json()['token'],'Authorization':'Bearer '+token})
  r=await c.post('/api/plugins/dafeiyu/delivery',json={'id':event_id,'delivered':bool(delivered),'text':text})
  r.raise_for_status()
