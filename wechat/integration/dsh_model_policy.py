"""Explicit model routing; a text-only model must never silently consume images."""

def select_model(job,config):
    policy=config.get('dsh_models',{}).get(job['scope'],{})
    if not isinstance(policy,dict) or set(policy)-{'text','image'}:raise ValueError('Invalid DSH model policy')
    text=policy.get('text','deepseek-flash');image=policy.get('image','deepseek-flash')
    if text not in ('deepseek-flash','deepseek-v4-pro') or image!='deepseek-flash':raise ValueError('Unsupported DSH model or image modality')
    selected=image if job.get('visualEvent') else text
    allowed=config.get('allowed_dsh_models')
    if allowed is not None and (not isinstance(allowed,list) or selected not in allowed):raise ValueError('Model blocked by owner model restriction')
    return selected

def model_description(model):
    if model=='deepseek-flash':return {'display_name':'DeepSeek V4.1 Flash','model_id':'deepseek-flash','mapping_source':'https://www.deepseek.com/news/deepseek-v4-1-flash/','mapping_verified_on':'2026-10-23','server_weights_attested':False}
    return {'display_name':model,'model_id':model,'server_weights_attested':False}
