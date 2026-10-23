"""Generate a role-bound candidate; only native receipts commit delivered history."""
import asyncio,base64,hashlib,json,sys,uuid,time,re,sqlite3
from datetime import datetime,timezone,timedelta
from pathlib import Path
import httpx
from dsh_runtime import Runtime,ROOT
from dsh_policy import admitted,reply_candidate

async def generate(file):
    folder=(ROOT/'runtime/dsh-requests').resolve();file=Path(file).resolve()
    if file.parent!=folder:raise ValueError('Unknown DSH request folder')
    request=json.loads(file.read_text(encoding='utf-8'))
    jobs=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'))
    job=jobs[request['job']['id']]
    cfg=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'))
    if not admitted(job,cfg):raise ValueError('Not an admitted DSH job')
    if job['scope']!=request['job']['scope'] or job['avatar']!=request['job']['avatar']:raise ValueError('Role changed')
    if job.get('dshDeadline',0)<=time.time()*1000:raise ValueError('DSH generation deadline expired')
    from dsh_model_policy import select_model,model_description
    model=select_model(job,cfg)
    request['generationModel']={'provider':'deepseek-account','id':model,**model_description(model),'reason':'image_capable_route' if job.get('visualEvent') else 'text_route'}
    request['job']=job;file.write_text(json.dumps(request,ensure_ascii=False),encoding='utf-8')
    from style_evolution import prepare as prepare_style
    request['persona']=prepare_style(job,cfg,request.get('persona',''))
    request['clock']={'now':datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds'),'timezone':'Asia/Shanghai','history_time_semantics':'recorded_at is message record time, not when a photo was taken; unknown timestamps remain unknown'}
    from context_projection import conversational_history,fresh_greeting_history
    request['history'],retired=conversational_history(request.get('history',[]),job['text'])
    request['contextProjection']={'retired_layout_messages':retired,'canonical_history_unchanged':True}
    request['history'],retired_prose=fresh_greeting_history(request['history'],job['text'])
    request['contextProjection']['retired_old_assistant_style_turns']=retired_prose
    from interaction_state import from_history
    request['interactionState']=from_history(request['history'],current_text=job['text'])
    from conversation_grounding import annotate_history
    request['history']=annotate_history(request['history'])
    from reading_journal import context_for_turn
    try:request['recentReadings']=context_for_turn(job,jobs,cfg)
    except (OSError,ValueError,KeyError,sqlite3.Error):
        request['recentReadings']=None
    recalled_videos=[{'id':item['id'],**item['coverage']} for item in (request['recentReadings'] or {}).get('items',[]) if item['kind'] in ('video','picture_note')]
    if job.get('nativeVideo'):recalled_videos.append(job['nativeVideo'])
    if recalled_videos:file.with_suffix('.video-evidence.json').write_text(json.dumps({'job_id':job['id'],'readings':recalled_videos}),encoding='utf-8')
    from conversation_planner import choose
    quality_root=Path('__PROJECT_ROOT__/qq-bridge/config')
    quality=json.loads((quality_root/'chat-quality.json').read_text(encoding='utf-8'))
    request['conversationPolicy']=(quality_root/'conversation-policy.txt').read_text(encoding='utf-8')
    if quality.get('wechatExpressionPlanner',False):
        request['replyPlan'],request['replyPlanAudit']=await choose(request)
    else:
        request['replyPlan']=None
        request['replyPlanAudit']={'status':'bypassed','version':quality['version'],'reason':'内容优先，表达长度与节奏由聊天模型决定'}
    from dsh_workspace import workspace_for
    workspace=workspace_for(job)
    from autonomy_policy import allowed as autonomy_allowed
    request['autonomyAuthorized']=autonomy_allowed(job)
    owner_work=not job.get('evaluation') and job['scope']=='private' and (job['kind']=='chat' or request['autonomyAuthorized'])
    from host_access import mode_for,overlay as host_overlay,process_access
    host_mode=mode_for(owner_work)
    request['adminQuery']=bool(re.search(r'角色卡|人设|工作区|权限|模型|后端|dsh|如何实现|怎么实现|怎么接|搭建|来自|怎么.*角色|个性化|养.*你|养.*好',job['text'],re.I))
    request['adminEvidence']={'active_persona_source':'SillyTavern selected character, not the stopped QR profile','avatar':job['avatar'],'card_file':'__TAVERN_ROOT__/data/default-user/characters/'+job['avatar'],'editor':'http://127.0.0.1:18020','selection_config':str(ROOT/'local/tavern.json'),'dsh_workspace':str(workspace),'dsh_file_write_scope':'workspace-write' if owner_work else 'read-only','persona_edit_route':'Edit selected character in dedicated Tavern UI, or owner explicitly asks /龙虾 to edit with backup; there is no model character-card write tool yet. Original dsh-wechat QR profile and root character-card-v2.json are not this active character source. Earlier replies naming them were incorrect; do not repeat their claims.'}
    request['adminEvidence']['generation_model']=request['generationModel']
    request['adminEvidence'].update(dsh_file_write_scope=host_mode,approval_policy='never',workspace_is_access_boundary=host_mode!='danger-full-access',**process_access())
    request['adminEvidence']['persona_edit_route']='Current-owner speaking feedback updates a versioned style section via evolve_chat_style and the automatic feedback hook; full persona changes remain available through the live Tavern card or authorized host tools. Never treat a style change as a change to facts or permissions.'
    request['adminEvidence']['active_message_route']={'wechat_transport':'bound alt native WeChat bridge on owner computer','role_and_history':'dedicated SillyTavern selected role and scope','reply_generation':'DSH SDK stdio','provider_authentication':'existing DeepSeek account login','custom_tavern_model_api_used_for_reply':False}
    file.write_text(json.dumps(request,ensure_ascii=False),encoding='utf-8')
    # Persona comes from the selected ST card exactly once. Existing source-bound
    # memory remains authoritative; the upstream autonomous soul writer must not
    # create an unverified second memory store or silently rewrite the card.
    patch=[{'id':'soul-md','disabled':True},
        *host_overlay(host_mode,workspace),
        {'id':'dafeiyu-context','disabled':False,'config':{'root':str(ROOT),'input':str(file)}}]
    from dsh_group_policy import overlay as group_overlay
    patch+=group_overlay(job)
    overlay=file.with_suffix('.patch.json');overlay.write_text(json.dumps(patch,ensure_ascii=False),encoding='utf-8')
    image=None;images=[]
    if job.get('visualEvent'):
        async with httpx.AsyncClient(base_url='http://127.0.0.1:18020',trust_env=False,timeout=10) as client:
            client.headers['X-CSRF-Token']=(await client.get('/csrf-token')).json()['token']
            response=await client.post('/api/plugins/dafeiyu/visual',json={'job_id':job['id']});response.raise_for_status();visual=response.json()
        if visual.get('image'):image=dict(type='image',data=visual['image'].split(',',1)[1],mimeType='image/jpeg')
        if visual.get('samples'):
            images=[dict(type='image',data=sample['image'].split(',',1)[1],mimeType='image/jpeg') for sample in visual['samples']]
            image=None
        request['visualEvidence']={'event_id':job['visualEvent'],'preview_attached':bool(image or images),'reason':visual.get('reason'),'detail':visual.get('detail'),'image_media':visual.get('image_media'),'samples':[{k:s[k] for k in ('frame','time_ms')} for s in visual.get('samples',[])]}
        file.write_text(json.dumps(request,ensure_ascii=False),encoding='utf-8')
    runtime=Runtime(patch=overlay,workspace=workspace,model=model)
    try:
        async with asyncio.timeout(max(.001,job['dshDeadline']/1000-time.time())):
            await runtime.start()
            trigger=job['text'] if job['kind']=='chat' else '运行时活动触发，不是用户新消息。处理临时资料中的本次活动；没有值得发的新内容可返回<SKIP>。'
            result=await runtime.run(('dafeiyu-evaluation-' if job.get('evaluation') else 'dafeiyu-wechat-')+uuid.uuid4().hex,trigger,image=image,images=images)
            if result['finish_reason']!='completed':raise RuntimeError('DSH did not complete a response')
            from candidate_review import review
            result,checked_candidate,review_audit=await review(runtime,file,request,result)
        latest=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8'))[job['id']]
        cfg=json.loads((ROOT/'local/tavern.json').read_text(encoding='utf-8'))
        if time.time()*1000>=job['dshDeadline']:raise TimeoutError('DSH candidate expired')
        if not admitted(latest,cfg):raise ValueError('Role changed before candidate completion')
        if result['finish_reason']!='completed':raise RuntimeError('DSH did not complete a response')
        candidate_file=file.with_suffix('.candidate.json')
        mode='prepared_candidate' if candidate_file.exists() else 'root_final_candidate'
        # Only completed root final text can supply the ordinary candidate path;
        # Runtime excludes progress, reasoning and tool-result events.
        candidate=checked_candidate
        if not candidate_file.exists():candidate_file.write_text(json.dumps(candidate,ensure_ascii=False),encoding='utf-8')
        messages=candidate.get('messages',[])
        if not candidate.get('silent') and not messages:raise RuntimeError('DSH prepared no reply')
        text='<SKIP>' if candidate.get('silent') else '<WECHAT_BUBBLE>'.join(messages)
        report=dict(text=text,bubbles=messages,backend='dsh-sdk',session=result['session'],model='deepseek-account/'+model,visual_attached=bool(image or images),wechat_sent=False,delivery_mode=mode)
        report['provenance_review']=review_audit
        report['reply_plan']=request['replyPlan'];report['reply_plan_audit']=request['replyPlanAudit']
        file.with_suffix('.result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        return report
    except Exception as error:
        file.with_suffix('.error.json').write_text(json.dumps({'error':str(error),'diagnostics':runtime.diagnostics},ensure_ascii=False,indent=2),encoding='utf-8')
        raise
    finally:await runtime.close()

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(asyncio.run(generate(sys.argv[1])),ensure_ascii=False))
