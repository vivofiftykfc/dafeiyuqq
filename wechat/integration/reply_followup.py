"""Honor an explicit quiet-company turn without inventing substitute dialogue."""
import re

def units(text):return [match.group() for match in re.finditer(r'(?:“[^”]*”|「[^」]*」|"[^"]*"|[^。！？?!\n])+[。！？?!\n]*',text)]

def question(unit):
    value=re.sub(r'“[^”]*”|「[^」]*」|"[^"]*"','',unit).strip()
    if re.search(r'[？?]',value):return True
    if re.search(r'(?:吗|么)[。！!]*$',value):return True
    if re.search(r'不用想|不必想|别问|不要问',value):return False
    return bool(re.search(r'怎么了|怎么回事|怎么样|发生什么|要不要|是不是|有没有|想不想|能不能',value))

def violations(draft,request):
    if request.get('interactionState',{}).get('followup_permission')!='do_not_append':return []
    return [unit.strip() for message in draft.get('messages',[]) for unit in units(message) if question(unit)]

def unplanned_interviews(draft,request):
    """Review a topic-switching interview tail, not every conversational question.

    A soft per-turn plan is not a user prohibition: callers may request one
    correction, but must not automatically delete questions on this signal.
    """
    plan=request.get('replyPlan') or {}
    if plan.get('followup') is not False or plan.get('mode') not in ('react','play','company','explore'):return []
    if re.search(r'问问我|问我.{0,8}(?:问题|发生|怎么)|你来问',request.get('job',{}).get('text','')):return []
    clauses=[part.strip() for message in draft.get('messages',[]) for part in units(message) if part.strip()]
    if not clauses or not question(clauses[-1]):return []
    tail=re.sub(r'“[^”]*”|「[^」]*」|"[^"]*"','',clauses[-1])
    pattern=(r'你呢[？?。！!]*$|你(?:倒是)?(?:说说|讲讲).{0,25}(?:今天|最近|什么|啥|分享)'
             r'|(?:最近|今天).{0,25}(?:什么|啥).{0,16}(?:好玩|有趣|有意思|想分享|想聊|想说)'
             r'|你.{0,12}(?:有没有|想不想).{0,18}(?:分享|聊聊|说说|讲讲|好玩|有趣)'
             r'|你.{0,8}(?:纠结|更在意).{0,25}(?:还是|哪)'
             r'|你现在(?:在干嘛|忙什么)|你(?:最近|今天)(?:怎么样|过得怎么样|在忙啥)')
    return [clauses[-1]] if re.search(pattern,tail) else []

def without_questions(draft):
    messages=[''.join(unit for unit in units(message) if not question(unit)).strip() for message in draft.get('messages',[])]
    messages=[message for message in messages if message]
    return {**draft,'messages':messages,'silent':not bool(messages)}
