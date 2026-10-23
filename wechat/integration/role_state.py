"""Account permissions stay in privacy_policy; only persona and memory namespace vary."""
import hashlib,json
from privacy_policy import ROOT,PRIVATE_PEER

def scope(target):return 'private' if target==PRIVATE_PEER else 'group'

def dsh_enabled(target):
 cfg=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'))
 return target==PRIVATE_PEER and 'private' in cfg.get('enabled_scopes',[]) and cfg.get('generation_backends',{}).get('private')=='dsh'
def selected(target):
 cfg=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'))
 return cfg.get('roles',{}).get(scope(target),{'avatar':'小鲸鱼私聊.png' if scope(target)=='private' else '小鲸鱼群聊测试.png','name':'小鲸鱼'})
def key(target):return hashlib.sha256(selected(target)['avatar'].encode()).hexdigest()[:16]
def memory_scope(target):
 s=scope(target);a=selected(target)['avatar']
 if (s,a) in [('private','小鲸鱼私聊.png'),('group','小鲸鱼群聊测试.png')]:return s
 return s+':role:'+key(target)
def persona(target):
 a=selected(target)['avatar'];p=ROOT/'runtime/tavern-cards.json'
 if p.exists():
  cards=json.loads(p.read_text(encoding='utf-8'))
  card=next((x for x in cards if x['avatar']==a),None)
  if card:return '\n'.join(str(card.get(k,'')) for k in ('description','personality','scenario'))[:18000]
 return (ROOT/'assets/identity/PRIVATE-V17.md').read_text(encoding='utf-8')

def format_reply(target,text):
 cfg=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'))
 prefs=cfg.get('reply_styles',{}).get(scope(target)+':'+selected(target)['avatar'],{})
 if prefs.get('single_paragraph') and '```' not in text:
  import re
  text=re.sub(r'\s*\n+\s*',' ',text).strip()
 if prefs.get('omit_final_period'):text=text.rstrip().rstrip('。.')
 return text

def delivery_bubbles(target,text,bubbles=None):
 cfg=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'))
 prefs=cfg.get('reply_styles',{}).get(scope(target)+':'+selected(target)['avatar'],{})
 values=[str(x).strip() for x in (bubbles or [text]) if str(x).strip()]
 if prefs.get('bubble_mode')=='single':values=[' '.join(values)]
 return [format_reply(target,x) for x in values]
