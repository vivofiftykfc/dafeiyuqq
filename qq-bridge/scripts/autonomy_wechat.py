"""Drain only the coordinator's durable, allowlisted WeChat text outbox."""
import json,sqlite3,time
from pathlib import Path
DB=Path(r'__PROJECT_ROOT__\qq-bridge\state\autonomy.sqlite')
def managed():
    return DB.exists()

async def drain(send,account,allowed,db_path=DB,paused=None):
    if not db_path.exists():return
    db=sqlite3.connect(db_path,timeout=5);db.row_factory=sqlite3.Row
    try:
        cfg=json.loads(db.execute('SELECT data FROM settings WHERE id=1').fetchone()[0])
        if not cfg['enabled']:return
        hour=time.gmtime(time.time()+8*3600).tm_hour
        if not cfg['startHour']<=hour<cfg['endHour']:return
        rows=db.execute("SELECT s.id,s.text,s.at,d.peer,d.account FROM shares s JOIN destinations d ON d.id=s.destination WHERE s.state='queued' AND d.platform='wechat' AND d.enabled=1 ORDER BY s.at LIMIT 100").fetchall()
        row=next((r for r in rows if r['peer'] not in (paused or set())),None)
        if not row:return
        if row['account']!=account or row['peer'] not in allowed or time.time()*1000-row['at']>30*60000:
            db.execute("UPDATE shares SET state='expired' WHERE id=?",(row['id'],));db.commit();return
        changed=db.execute("UPDATE shares SET state='sending' WHERE id=? AND state='queued'",(row['id'],)).rowcount;db.commit()
        if not changed:return
        try:
            confirmed=await send(row['peer'],row['text'],'autonomy:'+row['id'])
            state='sent' if confirmed else 'uncertain'
        except Exception:state='uncertain'
        db.execute('UPDATE shares SET state=? WHERE id=?',(state,row['id']));db.commit()
    finally:db.close()
