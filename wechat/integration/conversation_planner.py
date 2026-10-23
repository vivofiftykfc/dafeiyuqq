"""A tool-free, per-turn speech plan. Never grants permission or edits memory."""
import asyncio,json,time,re
import httpx
from privacy_policy import ROOT
from structured_completion import json_completion
from interaction_state import recent

MODES={'react','play','comfort','company','explore','task'}

def planning_history(history,now=None):
    now=time.time() if now is None else now
    rows=[row for row in history if recent(row,now)][-8:]
    return [{key:row.get(key) for key in ('speaker','text','recorded_at','grounding')}|{'text':str(row.get('text',''))[:700]} for row in rows]

def validate(value,request):
    if not isinstance(value,dict) or value.get('mode') not in MODES:return None
    if request.get('interactionState',{}).get('quiet_context_released') and value['mode']=='company':return None
    if type(value.get('target_chars')) is not int or not 20<=value['target_chars']<=1600:return None
    if type(value.get('followup')) is not bool or type(value.get('bubble_count')) is not int or value['bubble_count'] not in (1,2,3):return None
    if not isinstance(value.get('focus'),str) or not 1<=len(value['focus'])<=240:return None
    users=[str(row.get('text','')) for row in request.get('history',[]) if row.get('speaker')=='user']+[request['job']['text']]
    quotes=value.get('grounding_quotes',[])
    quotes=list(dict.fromkeys(quote for quote in quotes if isinstance(quote,str) and 0<len(quote)<=200 and any(quote in text for text in users)))[:6] if isinstance(quotes,list) else []
    plan={key:value[key] for key in ('mode','target_chars','followup','bubble_count','focus')};plan['grounding_quotes']=quotes
    current=request['job']['text'];moves=[]
    from reply_attribution import owner_distress_disclosed
    image_feeling_question=bool(re.search(r'(?:觉得|感觉|看着).{0,20}(?:玉玉|压抑|丧|难过|伤心|孤独|悲伤)',current)) and '我' not in current
    if request['job'].get('visualEvent') and plan['mode']=='comfort' and (current.strip()=='[图片]' or image_feeling_question) and not owner_distress_disclosed(request.get('history',[]),current):
        plan.update(mode='react',followup=False,focus='回应这张图片本身的氛围与分享，不把图中情绪当作发图者的处境',grounding_adjustment='image_subject_not_owner_distress')
    if re.search(r'你(?:自己)?的(?:看法|想法|观点)|你怎么看|不同的?(?:看法|观点|理解|角度)',current):moves.append('offer_own_view')
    if re.search(r'建议|怎么办|怎么做|我该',current):moves.append('consider_practical_advice')
    if re.search(r'问问我|问我发生|问我怎么',current):moves.append('invite_specific_context')
    plan['requested_moves']=moves
    if plan['mode'] in ('comfort','explore') and re.search(r'多陪我说|详细(?:些|点|说)|展开(?:说|聊)|安慰我一大通|多安慰',current):
        plan['depth']='expanded';plan['target_chars']=max(240,plan['target_chars'])
    if request.get('interactionState',{}).get('followup_permission')=='do_not_append':plan['followup']=False
    if request.get('replyStyle',{}).get('bubble_mode')=='single':plan['bubble_count']=1
    return plan

async def classify(request):
    config=json.loads((ROOT/'local/config.json').read_text(encoding='utf-8-sig'))
    history=planning_history(request.get('history',[]))
    text=request['job']['text'];payload={'current':text if len(text)<=2400 else text[:1200]+'\n[中间省略]\n'+text[-1200:],'recent':history,'clock':request.get('clock'),'quiet_state':request.get('interactionState',{}),'has_image':bool(request['job'].get('visualEvent'))}
    memories=request.get('memories',[])
    payload['relevant_user_preferences']=[{key:row[key] for key in ('kind','quote','value','created_at') if key in row} for row in memories[:8] if isinstance(row,dict)] if isinstance(memories,list) else []
    prompt='你只规划微信这一轮交流，不写回复、不执行操作。输出JSON：mode为react/play/comfort/company/explore/task之一，分别对应普通问候分享、逗趣亲近、明确难受的倾诉、明确安静陪伴、展开讨论观点、实际办事；早安和普通招呼不是默认的情绪安慰，target_chars为预计中文字数，followup为是否确需一个后续问题，bubble_count为1到3，focus为本轮重点，grounding_quotes为相关用户原话。普通分享和随口问视频通常只接一两个具体细节，不因工具返回很多就逐项复述；用户明确想深入、比较不同观点时才展开。认真倾诉要有具体回应和温度，可以比闲聊多说，不能只用一句敷衍。用户同时要陪伴、独立观点或建议时，重点不能漏掉他明确要的部分，不能用一个漂亮比喻替代回应。安静陪伴停止分析。quiet_state.quiet_context_released=true表示上一轮安静陪伴已结束，用户已经带来新的有内容的发言，必须接当前的新内容，不能叫他先别管。纠正要承接事实，不做自我检讨。长短按需要，不按用户消息长度机械决定，不总选两条，随口分享默认不追问，只有一个具体且必要的疑问才安排问题。用户已给出链接或图片时，安排读取资料后回应内容，不让用户先复述。引文只能来自用户发言，不能把旧回复的推断当成用户事实。计划不是工具授权。'
    async with httpx.AsyncClient(timeout=8,trust_env=False) as client:
        return await json_completion(client,'https://api.deepseek.com/v1/chat/completions',{'Authorization':'Bearer '+config['api_key']},{'model':'deepseek-flash','thinking':{'type':'disabled'},'max_tokens':1200,'response_format':{'type':'json_object'},'messages':[{'role':'system','content':prompt},{'role':'user','content':json.dumps(payload,ensure_ascii=False)}]})

async def choose(request):
    job=request['job'];start=time.monotonic()
    if job.get('kind')!='chat' or job.get('scope')!='private':return None,{'status':'not_applicable'}
    from context_projection import layout_turn
    layout=layout_turn(request.get('history',[]),job['text'])
    if layout:
        focus=('简短接住这次表达格式的纠正，实际照做即可，不重述规则，不打比方解释，不让用户再选格式，也不把合成一条误说成要攒着等' if layout=='correction' else '这是上一项格式纠正的收尾，只回应他的确认本身，不复述一块回等规则，不再承诺、解释、复盘或开启别的话题')
        return validate({'mode':'react','target_chars':25,'followup':False,'bubble_count':1,'focus':focus},request),{'status':'layout_'+layout}
    if request.get('interactionState',{}).get('reason')=='user_requests_quiet_company':
        return validate({'mode':'company','target_chars':60,'followup':False,'bubble_count':1,'focus':'陪伴眼前这一会儿，不分析也不索取回答'},request),{'status':'explicit_quiet_request'}
    from context_projection import simple_greeting
    if simple_greeting(job['text']):
        return validate({'mode':'react','target_chars':45,'followup':False,'bubble_count':1,'focus':'回应眼前的招呼，熟悉亲近，不推测心情和作息，也不安排照顾任务','grounding_quotes':[job['text']]},request),{'status':'simple_greeting'}
    if job.get('dshDeadline',0)/1000-time.time()<45:return None,{'status':'insufficient_budget'}
    try:
        async with asyncio.timeout(8):value=await classify(request)
        plan=validate(value,request)
        return plan,{'status':'planned' if plan else 'invalid_plan','elapsed_ms':round((time.monotonic()-start)*1000)}
    except (TimeoutError,httpx.HTTPError,ValueError,KeyError,OSError,TypeError):return None,{'status':'unavailable','elapsed_ms':round((time.monotonic()-start)*1000)}
