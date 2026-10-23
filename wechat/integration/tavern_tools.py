"""Read-only inventory and capability evidence for the ST adapter."""
import json,sys,re
from capability_context import inventory
from privacy_policy import PRIVATE_PEER,ROOT

def snapshot(query=''):
 items=inventory(PRIVATE_PEER)
 if re.search(r'动图|动态|会动|gif',query,re.I):
  from image_animation import inspect
  animated=[]
  for item in items:
   try:media,_=inspect((ROOT/item['path']).read_bytes())
   except (OSError,ValueError):continue
   if media['animated']:animated.append({**item,'image_media':media})
  items=animated
 terms=[query[i:i+2] for i in range(max(1,len(query)-1))]
 items.sort(key=lambda x:sum(t in x['caption']+' '.join(x['tags']) for t in terms),reverse=True)
 return {'items':[{k:x.get(k) for k in ('id','caption','tags','use_when','avoid_when','image_media')} for x in items[:12]],'total':len(items),'sent':False,'native_animation_playback_verified':False}
if __name__=='__main__':
 sys.stdout.reconfigure(encoding='utf-8')
 print(json.dumps(snapshot(sys.argv[1] if len(sys.argv)>1 else ''),ensure_ascii=False))
