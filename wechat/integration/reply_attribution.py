"""Narrow review triggers, not diagnoses or automatic verdicts about a reply."""
import re

def owner_distress_disclosed(history,current_text):
    statements=[current_text]+[str(row.get('text','')) for row in history[-5:] if row.get('speaker')=='user' and row.get('modality')!='image' and row.get('grounding')!='user_shared_image_not_a_personal_statement' and not str(row.get('text','')).startswith('[图片]')]
    return any(re.search(r'我(?:现在|最近|今天|这几天|一直|也|真的|有点|很|特别|好|不太)*.{0,3}(?:难过|伤心|低落|难受|抑郁|焦虑|心情不好|分手|失恋|失眠)',statement) for statement in statements)

def attribution_review_triggers(text,history,current_text,has_visual=False):
    triggers=[]
    # A corrective follow-up must not retroactively turn an uncertain answer
    # into a claim that the assistant deliberately concealed the truth.
    previous=next((str(row.get('text','')) for row in reversed(history) if row.get('speaker')=='assistant'),'')
    challenge=bool(re.search(r'看出来|看懂|没看|不是|不对|明明|刚才|装傻',current_text))
    uncertain=bool(re.search(r'看着像|像是|又像|可能|不确定|看不清|没看懂|不知道',previous))
    concealed=re.search(r'(?:第一眼就知道|早就(?:知道|看出来)|故意没(?:点破|说)|(?:憋着|等着)看你什么时候)[^。！？\n]{0,45}',text)
    if challenge and uncertain and concealed:
        triggers.append({'kind':'retrospective_concealment_after_uncertainty','excerpt':concealed.group(),'previous_assistant':previous[:240]})
    patterns=[
        ('inferred_inner_cause',r'(?:你(?:其实|本质上|真正需要|只是想)|说明你|心里那口气|潜意识.{0,12}(?:想|在|需要))[^。！？\n]{0,90}'),
        ('casual_biological_explanation',r'(?:多巴胺.{0,12}(?:冲|分泌|导致|作祟)|肾上腺素.{0,12}(?:冲|分泌|导致))[^。！？\n]{0,60}'),
    ]
    # An explicit science question may appropriately discuss biological mechanisms.
    science=bool(re.search(r'多巴胺|肾上腺素|生物学|神经科学|生理机制',current_text))
    for kind,pattern in patterns:
        if kind=='casual_biological_explanation' and science:continue
        for match in re.finditer(pattern,text):triggers.append({'kind':kind,'excerpt':match.group()})
    visual=has_visual or any(row.get('speaker')=='user' and (row.get('modality')=='image' or str(row.get('text','')).startswith('[图片]')) for row in history[-5:])
    if visual:
        pattern=r'(?:你自己这会儿|你今晚是不是|先叹.{0,12}再(?:拍|看)|你刚叹.{0,12}(?:去|看))[^。！？\n]{0,70}'
        for match in re.finditer(pattern,text):triggers.append({'kind':'possible_image_to_owner_inference','excerpt':match.group()})
        disclosed=owner_distress_disclosed(history,current_text)
        if not disclosed:
            leading=r'(?:你(?:今天|今晚|现在|这会儿|是不是)?[^。！？?]{0,12}(?:心里|心情|不开心|难过|伤心|低落|丧|闷)|(?:今天|今晚)心里)[^。！？?]{0,30}[？?]'
            for match in re.finditer(leading,text):triggers.append({'kind':'leading_mood_question_from_image','excerpt':match.group()})
    return triggers[:4]
