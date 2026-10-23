"""Exact, owner-only incoming voice extraction from the bound alt DB.

No process discovery, historic replay, fuzzy attachment selection or sending.
The bridge receives only genuine rows with a resolved sender and exact svr_id.
"""
import hashlib,json,sqlite3,sys,time
from pathlib import Path
from privacy_policy import ROOT,PRIVATE_PEER

def message_event(row,text):
    peer=row.get('peer',PRIVATE_PEER)
    from contact_scope import media_scope
    media_scope(peer,peer)
    expected='voice:'+str(row['server_id']) if peer==PRIVATE_PEER else 'voice:'+peer+':'+str(row['server_id'])
    if not isinstance(text,str) or not text.strip() or row['id']!=expected or not str(row['server_id']).isdigit():raise ValueError('Invalid genuine voice event')
    return {'self_wxid':'wxid_bot','is_self':False,'room_wxid':'','chat_id':peer,'sender_id':peer,'sender_wechat_name':('主人' if peer==PRIVATE_PEER else peer),'msg':text.strip(),'sequence':str(row['server_id']),'voice_event_id':row['id'],'message_type':34,'voice_source':row}

def state(path=None):
    c=sqlite3.connect(path or ROOT/'runtime/wechat-voice-inbox.sqlite')
    c.execute('CREATE TABLE IF NOT EXISTS config(key TEXT PRIMARY KEY,value REAL)')
    c.execute('INSERT OR IGNORE INTO config VALUES(?,?)',('started',time.time()))
    c.execute('CREATE TABLE IF NOT EXISTS voices(id TEXT PRIMARY KEY,state TEXT,updated REAL)')
    c.commit();return c

def incoming_rows(db,since,peer=PRIVATE_PEER):
    from contact_scope import media_scope
    media_scope(peer,peer)
    table='Msg_'+hashlib.md5(peer.encode()).hexdigest()
    result=[]
    for rel,_,_ in db._db_files:
        c=db._open(rel)
        try:
            if not c.execute('SELECT 1 FROM sqlite_master WHERE name=?',(table,)).fetchone():continue
            rows=c.execute('SELECT m.local_id,m.server_id,m.create_time FROM '+table+' m JOIN Name2Id n ON n.rowid=m.real_sender_id WHERE (m.local_type&255)=34 AND n.user_name=? AND m.create_time>=? ORDER BY m.create_time,m.local_id LIMIT 32',(peer,since))
            for row in rows:
                if row['server_id']:result.append({'peer':peer,'server_id':str(row['server_id']),'created':row['create_time'],'shard':rel,'local_id':row['local_id']})
        finally:c.close()
    return result

def voice_bytes(db,server_id,peer=PRIVATE_PEER):
    from contact_scope import media_scope
    media_scope(peer,peer)
    found=[]
    for rel,_,_ in db._db_files:
        c=db._open(rel)
        try:
            rows=c.execute('SELECT v.voice_data FROM VoiceInfo v JOIN Name2Id n ON n.rowid=v.chat_name_id WHERE n.user_name=? AND v.svr_id=?',(peer,int(server_id))).fetchall()
            found.extend(bytes(r[0]) for r in rows if r[0])
        finally:c.close()
    if not found:return None
    if len({hashlib.sha256(b).hexdigest() for b in found})!=1:raise ValueError('Conflicting voice payloads')
    raw=found[0]
    if not 0<len(raw)<=8*1024*1024 or not raw[:16].lstrip(b'\x02').startswith(b'#!SILK_V3'):raise ValueError('Invalid SILK payload')
    return raw

def poll():
    sys.path.append(str(ROOT/'runtime/MaiBot/.venv/Lib/site-packages'))
    from image_attachment_index import reader
    from wechat_social_reader import reader as media_reader
    c=state();result=[]
    try:
        started=c.execute("SELECT value FROM config WHERE key='started'").fetchone()[0]
        from contact_scope import allowed
        from wechat_allowlist import CONFIG
        config=json.loads(CONFIG.read_text(encoding='utf-8-sig'))
        peers=[PRIVATE_PEER]+[p for p in config.get('contacts',{}) if allowed(p)]
        rows=[row for peer in peers for row in incoming_rows(reader(),max(started,time.time()-180),peer)]
        for row in rows:
            peer=row['peer']
            identity='voice:'+row['server_id'] if peer==PRIVATE_PEER else 'voice:'+peer+':'+row['server_id']
            if c.execute('SELECT 1 FROM voices WHERE id=?',(identity,)).fetchone():continue
            try:raw=voice_bytes(media_reader(media=True),row['server_id'],peer)
            except RuntimeError:
                request=ROOT/'runtime/prepare-social-index.request'
                if not request.exists():request.write_text('bound voice media keys',encoding='utf-8')
                continue
            if raw is None:
                # A fresh shard may appear after the message row. Preparation is
                # requested only for a real pending voice, never at every poll.
                marker=ROOT/'runtime/prepare-social-index.request'
                status=ROOT/'runtime/wechat-social-index-status.json'
                if not status.exists() or time.time()-status.stat().st_mtime>30:marker.touch(exist_ok=True)
                continue
            from voice_storage import store_from_bridge
            from contact_scope import media_scope
            stored=store_from_bridge(raw,media_scope(peer,peer))
            # Durable claim before ASR: unknown failures never replay a message.
            c.execute('INSERT OR IGNORE INTO voices VALUES(?,?,?)',(identity,'claimed',time.time()));c.commit()
            if c.execute('SELECT changes()').fetchone()[0]:result.append({**row,'id':identity,'path':stored['path'],'sha256':stored['sha256']})
        return result
    finally:c.close()

if __name__=='__main__':print(json.dumps({'voices':poll()},ensure_ascii=False))
