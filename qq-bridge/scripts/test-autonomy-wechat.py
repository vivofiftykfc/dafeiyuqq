import asyncio,json,sqlite3,tempfile,time
from pathlib import Path
from autonomy_wechat import drain
async def main():
    file=Path(tempfile.mkdtemp())/'test.sqlite';db=sqlite3.connect(file)
    db.executescript('CREATE TABLE settings(id INTEGER PRIMARY KEY,data TEXT);CREATE TABLE destinations(id TEXT,platform TEXT,peer TEXT,account TEXT,enabled INTEGER);CREATE TABLE shares(id TEXT,text TEXT,at INTEGER,state TEXT,destination TEXT);')
    hour=time.gmtime(time.time()+8*3600).tm_hour
    db.execute('INSERT INTO settings VALUES(1,?)',(json.dumps({'enabled':True,'startHour':0,'endHour':24}),))
    db.execute("INSERT INTO destinations VALUES('group','wechat','group@chatroom','bot',1)")
    db.execute("INSERT INTO shares VALUES('one','测试内容',?,'queued','group')",(time.time()*1000,));db.commit()
    sent=[]
    async def send(target,text,id):sent.append((target,text,id));return True
    await drain(send,'wrong-account',{'group@chatroom'},file);assert not sent
    db.execute("UPDATE shares SET state='queued'");db.commit()
    await drain(send,'bot',{'group@chatroom'},file);assert len(sent)==1
    db.execute("INSERT INTO shares VALUES('paused-scope','暂停会话',?,'queued','group')",(time.time()*1000,));db.commit()
    await drain(send,'bot',set(),file,paused={'group@chatroom'})
    assert db.execute("SELECT state FROM shares WHERE id='paused-scope'").fetchone()[0]=='queued'
    db.execute("UPDATE shares SET state='cancelled' WHERE id='paused-scope'");db.commit()
    await drain(send,'bot',{'group@chatroom'},file);assert len(sent)==1
    db.execute("INSERT INTO shares VALUES('two','暂停',?,'queued','group')",(time.time()*1000,))
    db.execute('UPDATE settings SET data=?',(json.dumps({'enabled':False}),));db.commit()
    await drain(send,'bot',{'group@chatroom'},file);assert len(sent)==1
    print('PASS native WeChat outbox: account/target isolation, claim-before-send, no duplicate, pause')
asyncio.run(main())
