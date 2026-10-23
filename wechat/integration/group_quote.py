"""Render the exact planner-selected message, never the latest group message."""
import json
import re


def reply_id(segment):
    if segment.get('type') == 'reply':
        value = segment.get('data')
        return value if isinstance(value, str) else ''
    if segment.get('type') == 'seglist':
        ids = {reply_id(x) for x in segment.get('data', [])} - {''}
        if len(ids) > 1:
            raise ValueError('Multiple reply targets')
        return next(iter(ids), '')
    return ''


def render_quote(inbox, target, identity, text):
    if not identity:
        return text
    if identity.startswith('image-recovered:'):
        identity = identity.removeprefix('image-recovered:')
    identity = identity.removeprefix('vision:')
    row = inbox.execute('SELECT payload FROM messages WHERE id=?', (identity,)).fetchone()
    if row is None:
        raise ValueError('Reply target absent from this conversation inbox')
    source = json.loads(row[0])
    if source.get('chat_id') != target:
        raise ValueError('Cross-conversation quote rejected')
    author = source.get('sender_wechat_name') or source.get('sender_id', '未知成员')
    author = re.sub(r'[\r\n\x00-\x1f]', '', author)[:50]
    original = re.sub(r'\s+', ' ', source['msg']).strip()
    excerpt = original[:100] + ('…' if len(original) > 100 else '')
    # Explicit text quote, not an imitation native clickable quote object.
    return f'回复 {author}「{excerpt}」\n{text}'
