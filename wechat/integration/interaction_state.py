"""Ephemeral discourse ledger derived only from this role's actual dialogue."""
import re,time
from datetime import datetime,timezone,timedelta

def quiet_request(text):
    if re.search(r'(?:不用|不要|别).{0,10}问|(?:只是|就)想.{0,12}(?:待着|陪着|陪我|安静)',text):return True
    if re.search(r'(?:不用|不要|别|不想).{0,2}(?:你)?陪我',text):return False
    return bool(re.search(r'陪我.{0,5}(?:待|呆|坐).{0,4}(?:会|着|儿)|一起安静.{0,5}(?:会|待|坐)',text))
def opens_topic(text):return bool(re.search(r'换个话题|聊聊|讲讲|说说|问问我|为什么|你怎么看|[？?]',text))

def quiet_ack(text):
    value=re.sub(r'[\s，。！？!?～~…、]','',text)
    return bool(re.fullmatch(r'嗯+|唔+|哦+|唉+|好(?:的|呀|哦|吧)?|抱抱|蹭蹭|呜呜+|😮‍💨|🥺|🥹',value))

def recorded_age(row,now):
    stamp=row.get('recorded_at')
    if not stamp:return None
    try:parsed=datetime.fromisoformat(str(stamp).replace('Z','+00:00'))
    except ValueError:
        try:parsed=datetime.strptime(str(stamp),'%B %d, %Y %I:%M%p')
        except ValueError:return None
    if parsed.tzinfo is None:parsed=parsed.replace(tzinfo=timezone(timedelta(hours=8)))
    return now-parsed.timestamp()

def recent(row,now):
    age=recorded_age(row,now)
    return age is None or -60<=age<=1800

def from_history(history,now=None,current_text=''):
    now=time.time() if now is None else now
    questions=[];corrections=[]
    for row in history[-12:]:
        text=str(row.get('text',''))
        evidence={'source':row.get('source'),'recorded_at':row.get('recorded_at')}
        if row.get('speaker')=='assistant':
            if not recent(row,now):continue
            pattern=r'[^。！？?!\n]{2,180}[？?]|[^。！？?!\n]{0,100}(?:是不是|要不要|能不能|可不可以)[^。！？?!\n]{0,100}(?:[。！!\n]|$)'
            for match in re.finditer(pattern,text):
                quote=match.group().strip()
                if quote and not any(q['quote']==quote for q in questions):questions.append({**evidence,'quote':quote,'state':'already_asked_not_a_todo'})
        elif row.get('speaker')=='user' and re.search(r'我说的是|我指的是|我不是让|我没刚|你理解错|不是这个意思|别替我|不要再|别总|不用分析|别分析',text):
            corrections.append({**evidence,'quote':text[:350]})
    quiet_context=False
    for row in history[-6:]:
        if row.get('speaker')!='user' or not recent(row,now):continue
        text=str(row.get('text',''))
        if quiet_request(text):quiet_context=True
        elif opens_topic(text):quiet_context=False
    quiet=quiet_request(current_text) or (quiet_context and quiet_ack(current_text) and not opens_topic(current_text))
    recall=bool(re.search(r'知道我.{0,14}(?:说的|情况|意思)|记得我刚|记得刚才|你明白我.{0,8}意思',current_text))
    from context_projection import layout_turn
    layout=layout_turn(history,current_text)
    permission='do_not_append' if quiet or recall or layout else 'context_dependent'
    released=quiet_context and not quiet
    return {'recent_questions_already_asked':questions[-3:],'explicit_user_corrections':corrections[-3:],'followup_permission':permission,'quiet_context_released':released,'layout_turn':layout,'reason':'user_requests_quiet_company' if quiet else 'user_checks_prior_understanding' if recall else 'new_substantive_turn_after_quiet' if released else 'no_explicit_constraint'}
