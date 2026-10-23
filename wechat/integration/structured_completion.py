"""Retry only generation, never actions, on unusable structured output."""
import json

async def json_completion(client,url,headers,payload):
    attempts=[]
    for attempt in range(2):
        body=dict(payload)
        if attempt:
            body.pop('response_format',None)
            body['messages']=[*payload['messages'],{'role':'user','content':'上一轮结构化结果无效。请重新判断原任务，只输出合法JSON对象，不要代码围栏、空白或额外文字。所有原有规则保持有效。'}]
        response=await client.post(url,headers=headers,json=body)
        response.raise_for_status()
        choice=response.json()['choices'][0]
        text=choice['message'].get('content') or ''
        try:
            if choice.get('finish_reason')!='stop' or not text.strip():raise ValueError('Empty or incomplete JSON')
            result=json.loads(text)
            if not isinstance(result,dict):raise ValueError('Expected object')
            return result
        except (ValueError,TypeError):attempts.append('invalid structured output')
    raise ValueError('Structured decision unavailable after two attempts; no action authorized')
