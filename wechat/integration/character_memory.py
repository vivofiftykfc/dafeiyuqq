"""Evidence-bound per-character memory. Operational state is never a memory fact."""
import json,sqlite3,time,hashlib,sys,re
from datetime import datetime,timezone,timedelta
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def style_preference(text):
 if re.search(r'(?:[0-9一二三四五六七八九十百半几两]+)(?:个)?(?:秒钟|分钟|小时|天|周|个月|月)(?:之|以)?后|(?:[0-9一二三四五六七八九十两]+)点.{0,8}(?:叫|喊|提醒)|叫我(?:起床|吃饭|学习|复习|睡觉|一声|一下)',text):return False
 return bool(len(text)<=300 and re.search(r'以后|今后|往后|之后|下次|记住|一直',text) and re.search(r'聊天|讲话|说话|回复|称呼|叫我|跟我说|和我说|对我说|问我|问问题|追问|提问',text) and re.search(r'客气|亲近|亲切|随意|自然|分段|句号|称呼|叫我|简短|长一点|短一点|说教|分析我|问我|问问题|追问|提问',text))

class Memory:
 def __init__(self,path):
  self.db=sqlite3.connect(path)
  self.db.execute('CREATE TABLE IF NOT EXISTS facts(id TEXT PRIMARY KEY,scope TEXT,quote TEXT,source TEXT,created REAL,expires REAL,archived INTEGER DEFAULT 0)')
 def remember(self,scope,quote,source,user_text,days=180,replaces=None):
  if not isinstance(quote,str) or not 2<=len(quote)<=300 or quote not in user_text:raise ValueError('记忆必须有本轮用户原话作为证据')
  key=hashlib.sha256((scope+'\n'+quote).encode()).hexdigest()[:20]
  replaces=replaces or []
  if not isinstance(replaces,list) or len(replaces)>8 or any(not isinstance(x,str) for x in replaces):raise ValueError('Invalid superseded memories')
  superseded=[];now=time.time()
  with self.db:
   for old in dict.fromkeys(replaces):
    if self.db.execute('UPDATE facts SET archived=1 WHERE scope=? AND id=? AND archived=0',(scope,old)).rowcount:superseded.append(old)
   self.db.execute('INSERT OR REPLACE INTO facts VALUES(?,?,?,?,?,?,0)',(key,scope,quote,source,now,now+max(1,min(365,int(days)))*86400))
  return {'id':key,'quote':quote,'source':source,'superseded':superseded}
 def search(self,scope,query):
  rows=self.db.execute('SELECT id,quote,source,created,expires FROM facts WHERE scope=? AND archived=0 AND expires>? ORDER BY created DESC LIMIT 100',(scope,time.time())).fetchall()
  grams={query[i:i+2] for i in range(max(0,len(query)-1))}
  ranked=[(sum(g in r[1] for g in grams),r) for r in rows]
  result=[];zone=timezone(timedelta(hours=8))
  for score,r in sorted(ranked,key=lambda x:x[0],reverse=True):
   if score>0 or style_preference(r[1]):result.append({'id':r[0],'quote':r[1],'source':r[2],'created_at':datetime.fromtimestamp(r[3],zone).isoformat(timespec='seconds'),'expires_at':datetime.fromtimestamp(r[4],zone).isoformat(timespec='seconds')})
  return result[:6]
 def forget(self,scope,key):
  self.db.execute('UPDATE facts SET archived=1 WHERE scope=? AND id=?',(scope,key));self.db.commit();return {'archived':True}
def mutation_allowed(text,operation):
 if operation=='forget':return bool(re.search(r'忘掉|忘了|别记|不要记|删除.*记忆|删掉.*记忆|清除.*记忆|记错|纠正|改一下',text))
 return style_preference(text) or bool(re.search(r'记住|记一下|记下来|以后|下次|我(?:更|不|很|最|比较|其实)?喜欢|我叫|我的生日|我习惯|纠正|记错',text))

def main():
 request=json.loads(sys.argv[1]);jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'))
 job=jobs[request['job_id']]
 if job['state']!='running':raise ValueError('No active generation')
 scope=job['scope']+':'+job['avatar'];m=Memory(ROOT/'runtime/character-memory.sqlite');op=request['operation'];value=request.get('value','')
 if op=='search':result=m.search(scope,value)
 elif job.get('evaluation') or job.get('kind','chat')!='chat' or job['scope']!='private':raise ValueError('Only private user turns can change memory')
 elif not mutation_allowed(job['text'],op):raise ValueError('No user persistence or correction intent')
 elif op=='preference':
  if not style_preference(value) or value!=job['text']:raise ValueError('No explicit lasting communication preference')
  result=m.remember(scope,value,job['id'],job['text'])
 elif op=='remember':result=m.remember(scope,value,job['id'],job['text'],replaces=request.get('replaces'))
 elif op=='forget':result=m.forget(scope,value)
 else:raise ValueError('Unknown operation')
 print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
