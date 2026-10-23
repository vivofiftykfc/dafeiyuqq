import asyncio,json,tomllib,time
from pathlib import Path
import httpx
ROOT=Path(__file__).resolve().parents[1]
async def main():
    cfg=json.loads((ROOT/'local/config.json').read_text(encoding='utf-8-sig'))
    p=tomllib.loads((ROOT/'runtime/isolated/private-owner/config/bot_config.toml').read_text(encoding='utf-8'))['personality']
    rows=[]
    for mode in ('plain','json'):
        for question in ('如果记忆会变，还是同一个人吗？想听你的想法，别给我上课。','信息论和科幻电影能怎么放在一起聊？给一个具体想法就好。'):
            instruction='直接给出自然的非空聊天正文。' if mode=='plain' else 'Return exactly one JSON object with a nonempty string field text. Valid example of shape only: {"text":"answer"}. 内容用中文自然聊天。'
            payload={'model':'deepseek-flash','thinking':{'type':'enabled'},'reasoning_effort':'high','max_tokens':8192,'messages':[{'role':'system','content':p['personality']+'\n'+p['reply_style']+'\n'+instruction},{'role':'user','content':question}]}
            if mode=='json':payload['response_format']={'type':'json_object'}
            async with httpx.AsyncClient(timeout=180,trust_env=False) as c:
                r=await c.post('https://api.deepseek.com/v1/chat/completions',headers={'Authorization':'Bearer '+cfg['api_key']},json=payload);r.raise_for_status()
                result=r.json();choice=result['choices'][0];message=choice['message'];body=message.get('content') or ''
                row={'mode':mode,'question':question,'text':body,'visible':bool(body.strip()),'finish_reason':choice.get('finish_reason'),'reasoning_chars':len(message.get('reasoning_content') or ''),'usage':result.get('usage',{})}
                rows.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
                (ROOT/'runtime/reply-v12-diagnostic.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
asyncio.run(main())
