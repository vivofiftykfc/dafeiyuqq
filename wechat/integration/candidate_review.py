"""At most one DSH text-only correction; never repeats action tools."""
import asyncio,json,time
from dsh_policy import reply_candidate
from reply_provenance import unsupported_self_quotes
from reply_attribution import attribution_review_triggers
from reply_followup import violations as followup_violations,without_questions,unplanned_interviews
from reply_media_claims import violations as media_violations,remove_claims,narration_issues
from reply_pacing import excess as pacing_excess
from context_projection import layout_reply_issues

def candidate(file,job,result):
    path=file.with_suffix('.candidate.json')
    return reply_candidate(job,result['text'],json.loads(path.read_text(encoding='utf-8')) if path.exists() else None)

async def review(runtime,file,request,result):
    job=request['job'];draft=candidate(file,job,result);additional=[]
    evidence=file.with_suffix('.history-evidence.json')
    if evidence.exists():
        data=json.loads(evidence.read_text(encoding='utf-8'))
        if data.get('job_id')==job['id']:additional=data.get('assistant',[])
    issues=unsupported_self_quotes('\n'.join(draft.get('messages',[])),request['history'],job['text'],additional)
    has_visual=bool(job.get('visualEvent') or request.get('visualEvidence',{}).get('preview_attached'))
    attribution=attribution_review_triggers('\n'.join(draft.get('messages',[])),request['history'],job['text'],has_visual)
    followups=followup_violations(draft,request)
    interviews=unplanned_interviews(draft,request)
    media_file=file.with_suffix('.video-evidence.json');media=[]
    if media_file.exists():
        data=json.loads(media_file.read_text(encoding='utf-8'))
        if data.get('job_id')==job['id']:media=data.get('readings',[])
    media_claims=media_violations('\n'.join(draft.get('messages',[])),media)
    media_narration=narration_issues('\n'.join(draft.get('messages',[])),media,job['text'])
    pacing=pacing_excess(draft,request)
    layout_issues=layout_reply_issues(draft,request)
    callbacks=request.get('callbackHints',[]) if job.get('scope')=='group' and job.get('visualEvent') and not draft.get('silent') else []
    audit={'attempted':False,'unsupported_self_quotes':issues,'attribution_review_triggers':attribution,'unwanted_followups':followups,'unsupported_full_watch_claims':media_claims,'tools_in_revision':'prepare_reply_only'}
    audit['pacing_drift']=pacing
    audit['unplanned_interviews']=interviews
    audit['layout_issues']=layout_issues
    audit['unrequested_media_narration']=media_narration
    audit['repeated_own_callback_hints']=callbacks
    if not issues and not attribution and not followups and not media_claims and not media_narration and not pacing and not interviews and not layout_issues and not callbacks:return result,draft,audit
    file.with_suffix('.unreviewed.json').write_text(json.dumps(draft,ensure_ascii=False),encoding='utf-8')
    ready=file.with_suffix('.guard-ready.json')
    supported=ready.exists() and json.loads(ready.read_text(encoding='utf-8')).get('guard_supported') is True
    revised=None
    if supported and job['dshDeadline']/1000-time.time()>22:
        audit['attempted']=True
        ticket=file.with_suffix('.revision.json');ticket.write_text(json.dumps({'job_id':job['id'],'active':True}),encoding='utf-8')
        file.with_suffix('.candidate.json').unlink(missing_ok=True)
        try:
            async with asyncio.timeout(15):
                quote_check=('当前草稿冒认的历史引文：'+json.dumps(issues,ensure_ascii=False)+'。不要冒认这些话是你说过的。') if issues else ''
                attribution_check=('草稿中需要核对来源的归因：'+json.dumps(attribution,ensure_ascii=False)+'。这些是风险线索，不代表用户有这些情况。核对他的原话：不要从图片氛围、梦境或你自己之前的猜测推定他的心理需要、现实处境或身体机制；没有根据的因果解释直接删掉。可以有自己的感受和不同观点，直接谈眼前内容，不用把他分析一遍，也不用用另一个猜测补上。') if attribution else ''
                quiet_check=('本轮明确不需要追加问题，草稿仍在追问：'+json.dumps(followups,ensure_ascii=False)+'。回应陪伴就好，不把问题换个说法再问，不要求用户交代状态。') if followups else ''
                if any(item['kind']=='retrospective_concealment_after_uncertainty' for item in attribution):
                    attribution_check+='上一句明确给了不确定的判断，这次却声称早就知道、故意不说。不要替先前的误判编造动机；结合现有证据直接更正或承认没看准，仍不确定就保留不确定，不需要长篇自我解释。'
                media_check=('工具只读取了部分视频证据，并没有完整观看，草稿却声称'+json.dumps(media_claims,ensure_ascii=False)+'。直接根据实际内容聊你的感想，删掉冒称完整看过的话；不用给用户复述后台步骤或技术指标。') if media_claims else ''
                if media_narration:media_check+='这次只是问视频看法，草稿却在汇报抽帧或转写。直接说眼前画面和自己的感受，不解释读取流程，也不凭空推断剧情；对方若追问读取范围再准确说明。'
                pacing_check=('本轮草稿明显偏离自己选择的交流篇幅：'+json.dumps(pacing,ensure_ascii=False)+'。保留当前重点和真正的看法，收掉重复铺垫、逐项复述资料与不相干的延伸，意思说完整即可，不机械卡字或删成口号。用户认真想展开的部分不能略过。') if pacing else ''
                interview_check=('你自己判断本轮不需要追问，草稿结尾却临时转成采访：'+json.dumps(interviews,ensure_ascii=False)+'。接住他当前的话就好，不用另找话题向他索取素材，不把问题换个说法再问。') if interviews and not followups else ''
                layout_check=('这是说话方式的纠正或它的收尾，草稿却把纠正写成自我解释：'+json.dumps(layout_issues,ensure_ascii=False)+'。排版已由发送层落实。接住当前这句话即可，不再解释怎么回、不保证以后怎么说、不用比喻演示说话方式，也不把一条完整消息误解成攒着不回。若用户已经开启新话题就回应新话题。') if layout_issues else ''
                callback_check=('你自己的旧回复反复借用这些内容：'+json.dumps(callbacks,ensure_ascii=False)+'。当前是新收到的图片；若草稿又借这些旧梗或其近义说法开玩笑，换成当前画面本身的反应；没有借用就保留原句。不把其他群友的话或经历算给这条消息的发送者。') if callbacks else ''
                revised=await runtime.run(result['session'],'[内部候选核验，不是用户新发言，不执行任何操作] '+quote_check+attribution_check+quiet_check+media_check+pacing_check+interview_check+layout_check+callback_check+'请重新回应真正的当前用户消息，保留亲近和合适的深度，不解释检查过程，不调用其他工具。')
            if revised['finish_reason']=='completed':
                fixed=candidate(file,job,revised)
                remaining=unsupported_self_quotes('\n'.join(fixed.get('messages',[])),request['history'],job['text'],additional)
                if not remaining:
                    audit['outcome']='corrected' if issues else 'revised';audit['remaining_attribution_triggers']=attribution_review_triggers('\n'.join(fixed.get('messages',[])),request['history'],job['text'],has_visual)
                    if followup_violations(fixed,request):fixed=without_questions(fixed);audit['quiet_question_clauses_removed']=True
                    if media_violations('\n'.join(fixed.get('messages',[])),media):fixed=remove_claims(fixed);audit['unsupported_media_claim_clauses_removed']=True
                    audit['remaining_pacing_drift']=pacing_excess(fixed,request)
                    audit['remaining_unplanned_interviews']=unplanned_interviews(fixed,request)
                    audit['remaining_layout_issues']=layout_reply_issues(fixed,request)
                    audit['remaining_media_narration']=narration_issues('\n'.join(fixed.get('messages',[])),media,job['text'])
                    file.with_suffix('.candidate.json').write_text(json.dumps(fixed,ensure_ascii=False),encoding='utf-8')
                    return revised,fixed,audit
        except (TimeoutError,ValueError,RuntimeError) as error:
            audit['error']=type(error).__name__
            try:await runtime.request('session/cancel',{'sessionId':result['session']},timeout=2)
            except Exception:pass
        finally:ticket.write_text(json.dumps({'job_id':job['id'],'active':False}),encoding='utf-8')
    # A risk trigger is not proof: never replace an ordinary reply with a canned
    # error merely because a text-only review ran out of time.
    if not issues:
        if followups:draft=without_questions(draft);audit['quiet_question_clauses_removed']=True
        if media_claims:draft=remove_claims(draft);audit['unsupported_media_claim_clauses_removed']=True
        file.with_suffix('.candidate.json').write_text(json.dumps(draft,ensure_ascii=False),encoding='utf-8')
        audit['outcome']='quiet_followup_removed_without_extra_generation' if followups else 'review_unavailable_original_retained'
        return result,draft,audit
    # Don't knowingly deliver a fabricated quote or invent a connection failure.
    fallback=reply_candidate(job,'这句我记岔了')
    file.with_suffix('.candidate.json').write_text(json.dumps(fallback,ensure_ascii=False),encoding='utf-8')
    audit['outcome']='source_uncertain_fallback'
    return result,fallback,audit
