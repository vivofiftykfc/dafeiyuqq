"""Flag large drift from this turn's own plan; never truncate the reply."""
def excess(draft,request):
    plan=request.get('replyPlan') or {}
    if plan.get('mode') not in ('react','play','company','explore') or plan.get('depth')=='expanded':return None
    target=plan.get('target_chars')
    if type(target) is not int or target<20:return None
    text=''.join(draft.get('messages',[]))
    if '```' in text:return None
    size=len(text);threshold=max(260,target*2)
    if size<=threshold:return None
    return {'characters':size,'planned_approximate_characters':target,'review_threshold':threshold,'focus':plan.get('focus','')}
