"""Durable, idempotent image review queue; never sends WeChat messages."""
import hashlib,sqlite3,time

class CollectionQueue:
    def __init__(self,path):
        self.db=sqlite3.connect(path)
        self.db.row_factory=sqlite3.Row
        self.db.execute("CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,raw BLOB,description TEXT,origin TEXT,source TEXT,event TEXT,state TEXT,attempts INTEGER,next_try REAL,result TEXT,error TEXT)")
        self.db.execute("UPDATE jobs SET state='pending' WHERE state='running'")
        self.db.commit()

    def enqueue(self,raw,description,origin,source,event):
        identity=hashlib.sha256((source+'\n'+event).encode()+hashlib.sha256(raw).digest()).hexdigest()
        self.db.execute("INSERT OR IGNORE INTO jobs VALUES(?,?,?,?,?,?,'pending',0,0,NULL,NULL)",(identity,raw,description[:4500],origin,source,event))
        self.db.commit()
        return identity

    def claim(self):
        with self.db:
            row=self.db.execute("SELECT * FROM jobs WHERE state='pending' AND next_try<=? ORDER BY rowid LIMIT 1",(time.time(),)).fetchone()
            if row:self.db.execute("UPDATE jobs SET state='running',attempts=attempts+1 WHERE id=?",(row['id'],))
        return dict(row) if row else None

    def finish(self,identity,result):
        self.db.execute("UPDATE jobs SET state=?,result=?,raw=NULL,description='',error=NULL WHERE id=?",('collected' if result else 'rejected',str(result) if result else None,identity))
        self.db.commit()

    def fail(self,identity,error):
        row=self.db.execute('SELECT attempts FROM jobs WHERE id=?',(identity,)).fetchone()
        exhausted=row['attempts']>=3
        self.db.execute("UPDATE jobs SET state=?,error=?,next_try=?,raw=CASE WHEN ? THEN NULL ELSE raw END WHERE id=?",('failed' if exhausted else 'pending',str(error)[:300],time.time()+30*row['attempts'],exhausted,identity))
        self.db.commit()

    def counts(self):
        return dict(self.db.execute('SELECT state,count(*) FROM jobs GROUP BY state').fetchall())
