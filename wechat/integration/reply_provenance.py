"""Verify explicit quoted self-references against scoped delivered utterances."""
import re

def normalized(text):return re.sub(r'[^\w]','',text).lower()

def unsupported_self_quotes(text,history,user_text='',additional=()):
    if re.search(r'台词|虚构|原样输出|翻译这|复述这|写一段',user_text):return []
    sources=[normalized(str(row.get('text',''))) for row in history if row.get('speaker')=='assistant']
    sources.extend(normalized(str(x)) for x in additional)
    pattern=r'我(?:刚才|刚刚|之前|前面|方才)(?:说|讲|问|提)(?:过|的|了)?\s*[：:]?\s*[“"「‘\x27]([^”"」’\x27\n]{1,80})[”"」’\x27]'
    missing=[]
    for match in re.finditer(pattern,text):
        if re.search(r'如果|假如|假设|比如',text[max(0,match.start()-10):match.start()]):continue
        quote=match.group(1);parts=[normalized(x) for x in re.split(r'…+|\.{3,}',quote) if normalized(x)]
        visible=sources+[normalized(text[:match.start()])]
        if parts and not any(all(part in source for part in parts) for source in visible):missing.append(quote)
    return missing
