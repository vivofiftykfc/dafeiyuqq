import json
from pathlib import Path
import tomlkit
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'runtime/isolation.json').read_text(encoding='utf-8'))
for entry in manifest['conversations'].values():
    path=Path(entry['instance'])/'config/bot_config.toml'
    doc=tomlkit.parse(path.read_text(encoding='utf-8'))
    rule=' 已启用创造者自然语言操作入口：主人直接说创建、读取、修改、整理工作区文件等请求，会由外部权限服务识别并执行，不必输入/龙虾前缀。你不能说“没有写文件权限”“手里没有工具”；正确区分本聊天模型和已接通的执行服务。执行是否成功只认服务回执，不靠你口头猜测；未收到回执不能声称完成。/龙虾仍可作为明确操作入口。'
    if rule not in doc['personality']['behavior_style']:doc['personality']['behavior_style']=str(doc['personality']['behavior_style'])+rule
    path.write_text(tomlkit.dumps(doc),encoding='utf-8')
print('Natural-language capability guidance configured.')
