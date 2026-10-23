import re

def meme_query(text):
    if not re.search(r'表情(?:包)?|梗图',text):return None
    if re.search(r'不要|别发|别搜|不用|别人说|他说|她说|怎么实现',text):return None
    if not re.search(r'找|搜|来[点个张几]|发|给我|换[个张]|再来|还有',text):return None
    text=re.sub(r'@\S+\s*','',text)
    text=re.sub(r'你能不能|你能|可以|继续|给我|帮我|发点|发[个张些]|来[点个张]|找[个张点]|搜一下|别的|其他|表情包|表情|梗图|吗|嘛|请|吧',' ',text)
    return text.strip(' ，。？！?') or '大肥鱼 可爱'
