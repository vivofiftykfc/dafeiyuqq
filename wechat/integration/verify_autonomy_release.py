"""Isolated model conversation and public link check. Never sends WeChat messages."""
import asyncio,json,time,uuid
import httpx
from privacy_policy import ROOT
from douyin_share import resolve
from tavern_client import generate

async def main():
    report={'created':time.time(),'wechat_test_messages':0,'links':[],'conversation':[]}
    for url in ['https://v.douyin.com/oCVLtVKpt-g/','https://v.douyin.com/-kED6OOndJ8/','https://v.douyin.com/wG-G9-Ps1cw/','https://v.douyin.com/Y6jEf9qdCKo/']:
        try:report['links'].append({'input':url,'resolved':await resolve(url)})
        except Exception as error:report['links'].append({'input':url,'error':str(error)})
    session='autonomy-'+uuid.uuid4().hex
    for text in ['你也可以有自己的兴趣，别总等我指令。挑一件你现在真想弄清楚的事情，说说为什么。','这件事先留着，晚安，我去睡了。']:
        reply=await generate('eval:'+uuid.uuid4().hex,text,evaluation_session=session)
        report['conversation'].append({'input':text,'reply':str(reply),'job_id':reply.job_id})
    async with httpx.AsyncClient(trust_env=False,timeout=10) as client:
        response=await client.get('http://127.0.0.1:18005/health');report['media_health']=response.json()
    dest=ROOT/'runtime/autonomy-sdk-acceptance.json'
    dest.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':asyncio.run(main())
