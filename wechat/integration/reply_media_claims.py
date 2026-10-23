"""A bounded video read does not prove a complete viewing experience."""
import re
from reply_followup import units

PATTERN=r'(?<!没)(?<!你)(?:(?:看完|刷完|播完)(?!这(?:几|些)帧|第一帧|第[0-9]+帧|采样|片段|字幕)|完整看过|看了全片|从头到尾看(?:了|过)|(?:看|刷)(?:了|到)一半)'
NEGATED=r'(?:(?:没(?:有)?|未|不能(?:说|算)?|不敢说|不算|并非)(?:真的?|已经|完全|完整|连续|确实|认真|从头到尾|说|算|能|敢|有|都|还|算是| ){0,3}|(?:如果|假如|要是).{0,6})$'

def narration_issues(text,evidence,user_text):
    if not evidence or re.search(r'抽帧|采样|音轨|转写|字幕|证据|几帧|看完|看过|读到|读了|只看|看清|怎么(?:读取|识别|看到|知道)|看了多少|哪一段',user_text):return []
    if re.search(r'我(?:这边)?(?:只)?(?:抽|拿到|读到).{0,24}(?:帧|转写|音轨)|(?:抽样|采样)(?:了)?(?:几|六|6).{0,4}帧',text):return ['unrequested_media_read_process']
    return []
def violations(text,evidence):
    if not evidence or all(row.get('watched_entire_video') is True for row in evidence):return []
    return [match.group() for match in re.finditer(PATTERN,text) if not re.search(NEGATED,text[max(0,match.start()-12):match.start()])]

def remove_claims(draft):
    messages=[''.join(unit for unit in units(message) if not violations(unit,[{'watched_entire_video':False}])).strip() for message in draft.get('messages',[])]
    messages=[message for message in messages if message]
    return {**draft,'messages':messages or ['我只读到了视频的一部分，还不能说完整看过'],'silent':False}
