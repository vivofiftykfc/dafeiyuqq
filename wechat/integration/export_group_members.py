"""Export only group-observed identities; never export personal memory text."""
import csv,json,sqlite3
from member_identity import MemberIdentity,ROOT

def main():
    index=MemberIdentity()
    index.label('wxid_owner','wechat_handle','example_user','owner_provided','user-explicit-identity')
    people=sqlite3.connect('file:'+str(ROOT/'runtime/isolated/group-work/data/MaiBot.db')+'?mode=ro',uri=True)
    rows=[]
    for wxid,code in index.db.execute('SELECT wxid,code FROM members ORDER BY wxid'):
        labels=index.db.execute('SELECT kind,label,source,event FROM labels WHERE wxid=?',(wxid,)).fetchall()
        def values(kind):return ' / '.join(v for k,v,s,e in labels if k==kind) or '未读到'
        person=people.execute('SELECT person_id FROM person_info WHERE user_id=?',(wxid,)).fetchone()
        rows.append({'群内显示名':values('group_display'),'微信昵称':values('wechat_name'),'自定义微信号':values('wechat_handle'),'稳定账号ID':wxid,'本地编码':code,'麦麦person_id':person[0] if person else '未建立','群友称呼(未核实)':values('claimed_alias'),'来源':[dict(kind=k,value=v,source=s,event=e) for k,v,s,e in labels]})
    out=ROOT/'exports';out.mkdir(exist_ok=True)
    (out/'group-members.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    keys=[k for k in rows[0] if k!='来源']
    with (out/'group-members.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=keys,extrasaction='ignore');writer.writeheader();writer.writerows(rows)
    content='# 工作群成员身份对应表\n\n仅包含真实群消息中出现的账号及小号自身，不是完整成员名册。微信昵称来自小号联系人缓存；群内显示名来自原生 @ 或引用，不能保证区分群名片与全局昵称。自定义微信号未知时不猜测。群友称呼仅是指认，不是个人事实或权限依据。\n\n'
    content+='| '+' | '.join(keys)+' |\n| '+' | '.join('---' for _ in keys)+' |\n'
    for row in rows:content+='| '+' | '.join(str(row[k]).replace('|','／') for k in keys)+' |\n'
    (out/'group-members.md').write_text(content,encoding='utf-8')
    print(json.dumps({'members':len(rows),'table':str(out/'group-members.md')},ensure_ascii=False))
    people.close();index.db.close()

if __name__=='__main__':main()
