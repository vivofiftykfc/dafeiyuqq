"""Download and visually label a bounded Whale-chan collection, without sending."""
import asyncio,hashlib,json,re,time
from pathlib import Path
import httpx
from privacy_policy import ROOT,GROUP_PEER
from collect_public_memes import download
from media_core import describe,image_bytes
from social_features import completion

async def main():
    source=json.loads((ROOT/'runtime/public-meme-catalogs/blue-fish.json').read_text(encoding='utf-8'))
    source=[x for x in source if x.get('filename','').startswith('deepseek-') and not re.search('刀|裸|丝袜|捆|流口水|harness|脚|足|胸',x.get('alt','')+x['filename'],re.I)]
    chosen=[]
    for tag in ('打招呼','开心','害羞','睡觉','吃饭','疑惑','加油','感谢','委屈','无语','游戏','卖萌','得意','摸鱼'):
        chosen.extend(x for x in [x for x in source if tag in x.get('tags',[])][:4] if x not in chosen)
    chosen.extend(x for x in source if x not in chosen)
    accepted=[];errors=[];sem=asyncio.Semaphore(3)
    async with httpx.AsyncClient(timeout=40,trust_env=False,follow_redirects=False) as client:
        async def one(x):
            async with sem:
                if len(accepted)>=40:return
                try:
                    relative=x['original']
                    if not re.fullmatch(r'media/[\w-]+\.(png|jpg|jpeg|webp)',relative,re.I):return
                    url='https://raw.githubusercontent.com/EDMOK/blue-fish-archive/main/'+relative
                    raw=await download(client,url);image_bytes(raw)
                    visual=await describe(GROUP_PEER,'public-whale-pack',raw,'准确描述人物、衣服、表情动作、图中文字；是否可见蓝色长发和鲸鱼相关特征？只描述实际可见，不根据名字补全。')
                    label=await completion('依据视觉证据审核鲸鱼娘表情。必须为蓝色鲸鱼娘/大肥鱼主体且适合日常聊天，不收裸露色情、露骨文字、威胁图、隐私截图或角色不确定的图。标题不是证据。输出JSON {"accept":false,"caption":"实际图中文字和画面，说明情绪含义，不编台词","tags":[],"use_when":["适合的具体聊天情境"],"avoid_when":["会造成误解或冒犯的情境"]}。每个场景简短，区分撒娇玩笑与真实难过，不把卖惨图用于嘲笑求助者。',{'visual':visual['description']})
                    if label.get('accept') is not True:return
                    if not isinstance(label.get('caption'),str) or not label['caption'].strip():return
                    for field in ('tags','use_when','avoid_when'):
                        if not isinstance(label.get(field),list) or not label[field] or not all(isinstance(v,str) for v in label[field]):raise ValueError('Missing labels')
                    filename=x['filename'];p=ROOT/'assets/memes/whale-pack'/filename;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
                    item={'id':Path(filename).stem,'path':str(p.relative_to(ROOT)),'caption':label['caption'],'tags':label['tags'],'use_when':label['use_when'],'avoid_when':label['avoid_when'],'categories':['blue-fish'],'source':url,'source_page':'https://github.com/EDMOK/blue-fish-archive','sha256':hashlib.sha256(raw).hexdigest(),'reviewed':True,'review_method':'vision evidence + semantic suitability model; not human review','visual_evidence':visual['description']}
                    accepted.append(item);print('accepted',len(accepted),item['id'],flush=True)
                except Exception as e:errors.append({'id':x.get('filename'),'error':type(e).__name__})
        await asyncio.gather(*(one(x) for x in chosen[:70]))
    p=ROOT/'assets/memes/catalog.json';doc=json.loads(p.read_text(encoding='utf-8'));old={x['id']:x for x in doc['items']}
    for x in accepted:old[x['id']]=x
    doc['items']=list(old.values());temp=p.with_suffix('.tmp');temp.write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf-8');temp.replace(p)
    report={'created':time.time(),'count':len(accepted),'items':accepted,'errors':errors}
    (ROOT/'assets/memes/whale-pack/index.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    rows=['# 鲸鱼娘表情库','',f'本批 {len(accepted)} 张，来源与视觉审核记录见 index.json。均为模型视觉审核，非人工逐张审定。','', '| ID | 含义 | 适用情况 | 不适用情况 |','|---|---|---|---|']
    for x in accepted:rows.append('| '+' | '.join([x['id'],x['caption'],'；'.join(x['use_when']),'；'.join(x['avoid_when'])]).replace('\n',' ')+' |')
    (ROOT/'assets/memes/whale-pack/README.md').write_text('\n'.join(rows),encoding='utf-8')
    print(json.dumps({'accepted':len(accepted),'errors':errors},ensure_ascii=False))

if __name__=='__main__':asyncio.run(main())
