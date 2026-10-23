"""Extract image identity fields, never unrelated 32-hex transport keys."""
import re
import xml.etree.ElementTree as ET

def image_hashes(content):
    if not isinstance(content,str) or len(content)>1_000_000:return set()
    value=content.strip()
    # Legacy stored references occasionally contain only the image MD5.
    if re.fullmatch(r'[0-9a-fA-F]{32}',value):return {value.lower()}
    if '<!DOCTYPE' in value.upper() or '<!ENTITY' in value.upper():return set()
    # Native group messages prepend "sender:\n" before the image XML.
    value=re.sub(r'^[^<>\r\n]{1,128}:\r?\n\s*(?=<)','',value,count=1)
    # Native quoted sticker payloads may append a numeric suffix after </msg>.
    value=re.sub(r'(?<=</msg>):[0-9]{1,10}\s*$','',value,count=1)
    try:root=ET.fromstring(value)
    except ET.ParseError:return set()
    result=set()
    for element in root.iter():
        if element.tag not in ('img','emoji'):continue
        for key in ('md5','originsourcemd5','androidmd5','s60v3md5','s60v5md5','externmd5','cdnthumbmd5'):
            candidate=element.get(key,'')
            if re.fullmatch(r'[0-9a-fA-F]{32}',candidate):result.add(candidate.lower())
    return result
