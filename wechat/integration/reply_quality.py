"""Output-only guard. Never changes sender identity or invents replacement replies."""
import hashlib,re,time

class ReplyQuality:
    def __init__(self,db):
        self.db=db
        db.execute('CREATE TABLE IF NOT EXISTS output_fingerprints(target TEXT,digest TEXT,updated REAL,PRIMARY KEY(target,digest))');db.commit()
    def allow(self,target,text,now=None):
        now=time.time() if now is None else now
        normalized=re.sub(r'\s+','',text).strip()
        if not normalized or normalized in ('()','（）','[]','【】','{}'):return False
        digest=hashlib.sha256(normalized.encode()).hexdigest()
        row=self.db.execute('SELECT updated FROM output_fingerprints WHERE target=? AND digest=?',(target,digest)).fetchone()
        if row and now-row[0]<90 and (len(normalized)>=6 or normalized in ('0','不知道','不晓得')):return False
        return True
    def record(self,target,text,now=None):
        normalized=re.sub(r'\s+','',text).strip()
        digest=hashlib.sha256(normalized.encode()).hexdigest()
        self.db.execute('INSERT OR REPLACE INTO output_fingerprints VALUES(?,?,?)',(target,digest,time.time() if now is None else now));self.db.commit()
