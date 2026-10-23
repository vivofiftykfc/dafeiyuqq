"""A busy status reader must never terminate the message transport."""
import json,logging,time,uuid
def write_status(file,value,attempts=5):
    temporary=file.with_name(file.name+'.'+uuid.uuid4().hex+'.tmp')
    try:
        temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
        for attempt in range(attempts):
            try:temporary.replace(file);return True
            except PermissionError:
                if attempt+1<attempts:time.sleep(.02*(attempt+1))
        logging.warning('Status file busy; keeping previous snapshot, transport continues')
        return False
    except OSError:
        logging.exception('Status snapshot unavailable; transport continues')
        return False
    finally:
        try:temporary.unlink(missing_ok=True)
        except OSError:pass
