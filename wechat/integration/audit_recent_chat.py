"""Local review evidence from genuine owner/alt traffic. Never sends messages."""
import argparse
import datetime
import json
import re
import sqlite3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OWNER='wxid_owner'

def audit(limit=20):
    jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'))
    actual=sorted((j for j in jobs.values() if j['id'].startswith('wechat:') and j.get('scope')=='private'),key=lambda x:x.get('created',0))[-limit:]
    with sqlite3.connect('file:'+(ROOT/'runtime/wechat-delivery.sqlite').as_posix()+'?mode=ro',uri=True) as db:
        turns=[]
        for job in actual:
            prefix='tavern:'+job['id'][len('wechat:'):]+':'
            receipts=db.execute('SELECT id,state,updated FROM receipts WHERE target=? AND id LIKE ? ORDER BY id',(OWNER,prefix+'%')).fetchall()
            text=job.get('text','')
            if text.startswith('[桥接补充：') and '[当前消息]\n' in text:text=text.rsplit('[当前消息]\n',1)[1]
            turns.append(dict(id=job['id'],user=text[:1800],reply=job.get('result','')[:3000],state=job['state'],error=job.get('error'),
                plan=job.get('plan'),model_bubbles=job.get('bubbles'),native_receipts=receipts,
                recovered_empty=job.get('recoveredEmpty',False),
                elapsed_seconds=round((job.get('completed',job.get('created',0))-job.get('created',0))/1000,2)))
    with sqlite3.connect('file:'+(ROOT/'runtime/image-context.sqlite').as_posix()+'?mode=ro',uri=True) as db:
        images=[dict(id=i,state=s,received=t,description=d[:1600]) for i,s,t,d in db.execute(
            'SELECT id,state,stamp,description FROM images WHERE chat=? AND sender=? ORDER BY stamp DESC LIMIT 8',(OWNER,OWNER))]
    for turn in turns:
        signals=[]
        if re.search(r'\[(?:发送|发出|send).{0,12}(?:表情|图片|sticker)',turn['reply'],re.I):signals.append('literal_media_action_marker_requires_execution_check')
        if re.search(r'</?WECHAT_BUBBLE>',turn['reply'],re.I):signals.append('internal_bubble_delimiter_leaked')
        if not turn['plan']:signals.append('reply_planning_unavailable')
        if not turn['native_receipts'] and turn['reply'].strip()!='<SKIP>':signals.append('text_has_no_native_delivery_receipt')
        turn['review_signals']=signals
    result=dict(created=datetime.datetime.now().astimezone().isoformat(),scope='genuine owner/alt private chat only',quality_acceptance='Manual review required; receipt success is not chat-quality acceptance',
        turns=turns,images=images,requires_review=[x['id'] for x in turns if x['review_signals'] or x['state']!='done' or not x['reply'].strip() or any(r[1]!='sent' for r in x['native_receipts'])],
        unresolved_images=[x['id'] for x in images if x['state']!='ready'])
    destination=ROOT/'runtime/recent-private-chat-review.json'
    destination.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    return {'report':str(destination),'turns':len(turns),'flagged_turns':len(result['requires_review']),'unresolved_images':len(result['unresolved_images'])}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--limit',type=int,default=20);args=parser.parse_args()
    print(json.dumps(audit(max(1,min(100,args.limit))),ensure_ascii=False))
