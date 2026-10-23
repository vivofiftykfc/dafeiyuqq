"""Pin public references and a small source-attributed sticker library."""
import hashlib,json,shutil,urllib.request
from pathlib import Path
from privacy_policy import ROOT

identity=ROOT/'assets/identity';identity.mkdir(parents=True,exist_ok=True)
source=ROOT/'assets/character-source/images/base-six-views.png'
target=identity/'base-six-views.png';shutil.copy2(source,target)
manifest={'version':1,'name':'大肥鱼 / DeepSeek 鲸鱼娘（社区二创，非官方角色）',
 'visual_prompt':'同一位可爱的蓝色鲸鱼娘，圆脸、蓝色眼睛、深蓝到浅蓝渐变长发、一根弯曲呆毛、头两侧鲸鳍、大型蓝色鲸尾；日常蓝白配色女仆裙和白围裙、蓝色蝴蝶结。表情有灵气，角色比例与六视图一致，不替换成普通蓝发女孩',
 'references':[{'path':str(target.relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'role':'体型、头发、眼睛、鲸鳍、尾巴基准；图中的白色基础服不作为固定日常服装'}],
 'source':'https://github.com/xiaoweigen/deepseek-dafeiyu-assets','authors':['上善无形','ZipZipPipe','YunYueSama','xiaoweigen'],'license':'CC BY-NC-SA 4.0 plus applicable upstream attribution; see character-source/NOTICE.md',
 'self_scene_rule':'所有涉及她本人的场景必须带参考图；普通绘图不强加此角色。参考图不可用时拒绝声称形象一致。'}
(identity/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
directory=ROOT/'assets/memes';directory.mkdir(parents=True,exist_ok=True)
source_items=json.loads((ROOT/'runtime/meme-source.json').read_text(encoding='utf-8'))
names=['deepseek-bao-jing-shui-jiao.png','deepseek-bao-bi-jujue.png','deepseek-bao-shoubing.png','deepseek-bao-tou-wei-qu.png','deepseek-bao-xi-chuang-bian.png','deepseek-bao-xigua.png']
items=[]
for entry in source_items:
 if entry['filename'] not in names:continue
 url='https://raw.githubusercontent.com/EDMOK/blue-fish-archive/main/'+entry['original']
 path=directory/entry['filename']
 raw=urllib.request.urlopen(url,timeout=30).read()
 if len(raw)>16*1024*1024:continue
 from media_core import image_bytes
 image_bytes(raw);path.write_bytes(raw)
 items.append({'id':path.stem,'path':str(path.relative_to(ROOT)).replace('\\','/'),'caption':entry['alt'],'tags':entry.get('tags',[]),'categories':['blue-fish']+(['cute'] if '卖萌' in entry.get('tags',[]) or '睡觉' in entry.get('tags',[]) else ['abstract']),'source':url,'source_page':'https://github.com/EDMOK/blue-fish-archive','sha256':hashlib.sha256(raw).hexdigest(),'reviewed':False})
(directory/'catalog.json').write_text(json.dumps({'items':items,'notice':'个人使用；权利归各自作者。保留原图和来源，不把社区合集当成统一商用授权。未审查图片不自动发送。'},ensure_ascii=False,indent=2),encoding='utf-8')
print('Pinned identity and',len(items),'candidate memes')
