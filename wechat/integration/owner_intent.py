"""Natural owner requests; a classifier is not an authorization boundary."""
import re

def obvious_file_action(text):
    value=text.strip()
    if not re.match(r'^(请|帮我|给我|替我|麻烦|在|把|创建|新建|读取|打开|写|修改|追加|保存|删除)',value):return False
    if any(x in value for x in ('不要','不用','别写','别改','别删','别执行')):return False
    if any(x in value for x in ('别人说','他说','她说','引用','教我','怎么写','如何','如果','能不能写文件','能写文件吗')):return False
    return bool(re.search(r'(?:[\w\u4e00-\u9fff./\\-]+\.(?:md|txt|json|csv|py|html))',value,re.I) and re.search(r'写|创建|保存|修改|读取|删除|追加|打开',value))

def might_be_action(text):
    return any(x in text.lower() for x in ('写','记','整理','创建','保存','修改','读取','打开','删除','追加','文件','笔记','日记','计划','清单','龙虾','openclaw','执行','运行','命令','脚本','安装','下载','浏览器','终端','程序','目录'))
