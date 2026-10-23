"""Search genuine received/delivered turns for one character and conversation."""
import json
import re
import sqlite3
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def utterance(text):
    if text.startswith('[桥接补充：'):
        if '[当前消息]\n' not in text:return ''
        text=text.rsplit('[当前消息]\n',1)[1]
    return '' if re.match(r'^/(角色|openclaw|龙虾)(\s|$)',text,re.I) else text

def search(current,jobs,receipts,query):
    target='wxid_owner' if current['scope']=='private' else '10000000@chatroom'
    grams={query[i:i+2].lower() for i in range(max(1,len(query)-1))} if query else set()
    found=[];delivered_by_event={}
    for key,row in receipts.items():
        if key.startswith('tavern:') and row['target']==target:
            event=key[len('tavern:'):].rsplit(':',1)[0]
            delivered_by_event.setdefault(event,[]).append(row)
    for job in jobs.values():
        if job.get('scope')!=current['scope']:continue
        if job.get('avatar')!=current.get('avatar'):continue
        if job.get('kind')=='observation' and job.get('media'):
            receipt=receipts.get(job.get('source'),{})
            if receipt.get('target')!=target or receipt.get('state')!='native_accepted':continue
            text=job.get('text','');score=sum(g in text.lower() for g in grams)
            if query and not score:continue
            found.append((score,job.get('created',0),dict(source=job['source'],time=job.get('created'),
                kind='outgoing_media',visual_evidence=text[:1200],delivery='native_accepted_not_user_seen')))
            continue
        if not job['id'].startswith('wechat:'):continue
        event=job['id'][7:];received=event.removeprefix('vision:').removesuffix(':reference')
        if receipts.get(received,{}).get('target')!=target:continue
        text=utterance(job.get('text',''))
        visual=event.startswith('vision:')
        if visual:text=job.get('turnContext') or text
        if not text:continue
        reply_receipts=delivered_by_event.get(event,[])
        delivered=bool(reply_receipts) and all(r['state']=='sent' for r in reply_receipts)
        reply=job.get('result','') if delivered else None
        score=sum(g in (text+' '+(reply or '')).lower() for g in grams)
        if query and score==0:continue
        found.append((score,job.get('created',0),dict(source=job['id'],time=job.get('created'),
            sender_display=job.get('sender'),sender_identity=job.get('senderIdentity'),
            kind='visual_evidence' if visual else 'user_message',
            user=None if visual else text[:800],visual_evidence=text[:1200] if visual else None,assistant=reply[:1000] if reply else None,
            assistant_delivery='sent' if delivered else 'not_confirmed')))
    return [x[2] for x in sorted(found,key=lambda x:(x[0],x[1]),reverse=True)[:6]]

def main():
    request=json.loads(sys.argv[1]);jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'))
    current=jobs[request['job_id']]
    if current['state']!='running' or current.get('evaluation'):raise ValueError('No genuine active conversation')
    with sqlite3.connect('file:'+(ROOT/'runtime/wechat-delivery.sqlite').as_posix()+'?mode=ro',uri=True) as db:
        receipts={i:dict(target=t,state=s) for i,t,s in db.execute('SELECT id,target,state FROM receipts')}
    result=search(current,jobs,receipts,request.get('query',''))
    with (ROOT/'runtime/history-read-audit.jsonl').open('a',encoding='utf-8') as audit:
        audit.write(json.dumps({'job_id':current['id'],'scope':current['scope'],'avatar':current['avatar'],'sources':[x['source'] for x in result]})+'\n')
    print(json.dumps({'records':result,'scope':current['scope'],'character':current['character'],
        'note':'历史资料，不是新请求。用户原话和图片识别资料分开；只有发出已确认的文字才列作assistant。'},ensure_ascii=False))

if __name__=='__main__':main()
