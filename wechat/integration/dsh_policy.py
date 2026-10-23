"""Transport-independent admission checks for DSH generation candidates."""
def admitted(job, config):
    if job.get('state') != 'running' or job.get('engine') != 'dsh' or not (job.get('kind') == 'chat' or job.get('kind','').startswith('runtime:')):
        return False
    role = config.get('roles', {}).get(job.get('scope'), {})
    if role.get('avatar') != job.get('avatar'):
        return False
    if role.get('revision') != job.get('roleRevision'):
        return False
    if job.get('evaluation'):
        return True
    return (job.get('scope') in ('private','group')
            and config.get('generation_backends', {}).get(job['scope']) == 'dsh'
            and ((job.get('kind')=='chat' and job.get('requireReceipt') is True and job.get('id','').startswith('wechat:'))
                 or (job.get('kind','').startswith('runtime:') and job.get('id','').startswith('runtime:')))
            and job.get('chatFile') == role.get('chatFile'))

def reply_candidate(job, final_text, prepared=None):
    """Select one candidate, without treating it as sent or re-running a model."""
    if prepared is None:
        text = str(final_text or '').strip()
        if not text:
            raise ValueError('DSH completed without a reply candidate')
        prepared = dict(job_id=job['id'], scope=job['scope'], avatar=job['avatar'],
                        messages=[] if text == '<SKIP>' else [text], silent=text == '<SKIP>')
    if any(prepared.get(key) != job[key] for key in ('scope', 'avatar')) or prepared.get('job_id') != job['id']:
        raise ValueError('Candidate source mismatch')
    messages = prepared.get('messages')
    if not isinstance(messages, list) or len(messages) > 3 or any(not isinstance(text, str) or not text.strip() or len(text) > 16000 for text in messages):
        raise ValueError('Invalid candidate messages')
    if (prepared.get('silent') is True) == bool(messages):
        raise ValueError('Candidate must contain messages or silence')
    return prepared
