"""Keep completed layout setup out of casual dialogue; canonical logs stay intact."""
import re,time

def simple_greeting(text):
    return bool(re.fullmatch(r'(?:早(?:上好|安|呀|啊)?|晚上好|中午好|下午好|嗨|你好|我回来(?:了|啦))[\s，,。!！~～]*(?:(?:我)?(?:刚(?:刚)?醒(?:了)?|睡醒(?:了|啦)))?[\s，,。!！~～]*',text.strip()))

def fresh_greeting_history(history,current_text,now=None):
    """After an idle greeting, old assistant prose is not a style example.

    Preserve all user statements, observations and recent replies. The complete
    conversation remains in Tavern and is still available to the history tool.
    """
    if not simple_greeting(current_text):return history,0
    from interaction_state import recorded_age
    now=time.time() if now is None else now
    last_user=next((row for row in reversed(history) if row.get('speaker')=='user'),None)
    age=recorded_age(last_user,now) if last_user else None
    if age is None or age<=1800:return history,0
    kept=[row for row in history if row.get('speaker')!='assistant' or (recorded_age(row,now) is None or recorded_age(row,now)<=1800)]
    return kept,len(history)-len(kept)

def layout_control(text):
    if len(text)>180:return False
    explicit=re.search(r'一块回|一条消息|分条|分段|拆.{0,8}(?:条|句)|不要.{0,8}句号|不.{0,6}换行|这几句是一个段落|(?:几句|一句|这些).{0,8}(?:一个段落|一块回)',text)
    style_correction=(re.search(r'你.{0,25}(?:说话|回复|这句|人机|病句|砌墙|僵硬|工整)|(?:你的|这句|这条).{0,8}(?:回复|说话)|我说你',text) and re.search(r'人机|病句|砌墙|僵硬|工整|太整齐',text))
    return bool(explicit or style_correction)

def layout_acknowledgment(text):
    # Only retire short confirmations directly following a format exchange.
    # A new topic or a substantive correction must remain visible.
    return bool(re.fullmatch(r'(?:嗯+|好+|行+|对+|对的|是的|可以|知道了|明白了|懂了|确定|懂了没|明白没|就这样|比如这样|这样|确(?:定|实)?懂了|真懂了|行[，, ]*挺聪明的)[\s，,。!！?？~～]*',text.strip()))

def layout_turn(history,current_text):
    """A format correction and its closing acknowledgments are not new topics.

    Inspect user turns only: an assistant's repeated format promises cannot keep
    this state alive after the user has brought up something else.
    """
    if layout_control(current_text):return 'correction'
    if not layout_acknowledgment(current_text):return None
    for row in reversed(history):
        if row.get('speaker')!='user':continue
        text=str(row.get('text',''))
        if layout_control(text):return 'confirmation'
        if not layout_acknowledgment(text):return None
    return None

def layout_reply_issues(draft,request):
    """Narrow review signals for a format exchange, never a canned reply."""
    state=layout_turn(request.get('history',[]),request.get('job',{}).get('text',''))
    if not state:return []
    text=' '.join(draft.get('messages',[]))
    issues=[]
    if re.search(r'攒.{0,10}(?:回|发|说)|等你.{0,12}(?:再回|再发|说完)',text):
        issues.append('message_layout_misread_as_delayed_reply')
    if state=='confirmation' and re.search(r'以后|下次|我会|格式|不拆|一条|一块.{0,3}(?:回|发)',text):
        issues.append('completed_format_request_reopened')
    # Formatting is already enforced by delivery_bubbles. A short acceptance is
    # fine; long promises and metaphors are the very behaviour being corrected.
    if re.search(r'我(?:这边|会|以后)|嘴上|气口|行距|攒|不拆|句子|分条|分段|格式|排版',text) and len(text)>38:
        issues.append('format_correction_turned_into_monologue')
    return issues

def conversational_history(history,current_text):
    # References to a previous answer and format edits need the original exchange.
    if layout_control(current_text) or re.search(r'你(?:刚才|刚刚|刚)?说|你刚|这句话|那句话|什么意思|格式|句号|段落',current_text):return history,0
    # Closing acknowledgments still need the user's format correction as their
    # antecedent. Removing it before interaction_state/planning turns "懂了没"
    # back into an unrelated topic. Keep that user evidence while removing the
    # assistant's repetitive promises, which must not become style examples.
    active_layout=layout_turn(history,current_text) is not None
    kept=[];retire=False;count=0
    for row in history:
        if row.get('speaker')=='user':
            text=row.get('text','')
            retire=layout_control(text) or (retire and layout_acknowledgment(text))
        if retire and row.get('speaker') in ('user','assistant'):
            if not (active_layout and row.get('speaker')=='user'):
                count+=1;continue
        kept.append(row)
    return kept,count
