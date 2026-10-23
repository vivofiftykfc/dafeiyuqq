"""Read public HTTPS pages with verified DNS and pinned TLS destinations.

The machine's proxy DNS can return synthetic addresses. Resolve through HTTPS
instead of mislabelling a public blog as a private website or allowing LAN URLs.
"""
import ipaddress,json,os,re,subprocess,sys,tempfile
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,urljoin
import httpx
from privacy_policy import ROOT

def checked_url(url):
    if not isinstance(url,str) or len(url)>2048 or any(ord(c)<33 for c in url):raise ValueError('Invalid public URL')
    p=urlsplit(url)
    if p.scheme!='https' or p.username is not None or p.password is not None or p.port not in (None,443) or not p.hostname:raise ValueError('Only public HTTPS pages are accepted')
    host=p.hostname.encode('idna').decode('ascii')
    if not re.fullmatch(r'[a-z0-9.-]+',host,re.I) or '.' not in host or host.endswith(('.local','.localhost','.internal')):raise ValueError('Public DNS hostname required')
    try:ipaddress.ip_address(host)
    except ValueError:pass
    else:raise ValueError('DNS hostname required, not an IP literal')
    return host

def resolve_public(host):
    with httpx.Client(trust_env=False,timeout=12) as c:
        r=c.get('https://cloudflare-dns.com/dns-query',params={'name':host,'type':'A'},headers={'accept':'application/dns-json'});r.raise_for_status();data=r.json()
    addresses=[row['data'] for row in data.get('Answer',[]) if row.get('type')==1]
    if data.get('Status')!=0 or not addresses:raise ValueError('Public DNS lookup failed')
    if any(not ipaddress.ip_address(ip).is_global for ip in addresses):raise ValueError('Non-public DNS destination rejected')
    return addresses[0]

class PageText(HTMLParser):
    def __init__(self):super().__init__();self.ignored=0;self.parts=[];self.links=[];self.anchor=None;self.title=[];self.in_title=False
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style','noscript','svg'):self.ignored+=1
        if tag=='title':self.in_title=True
        if tag=='a' and not self.ignored:self.anchor=[dict(attrs).get('href',''),[]]
        if tag in ('p','div','br','li','h1','h2','h3','article'):self.parts.append('\n')
    def handle_endtag(self,tag):
        if tag in ('script','style','noscript','svg'):self.ignored=max(0,self.ignored-1)
        if tag=='title':self.in_title=False
        if tag=='a' and self.anchor:
            self.links.append({'url':self.anchor[0],'text':''.join(self.anchor[1]).strip()[:180]});self.anchor=None
    def handle_data(self,data):
        if self.ignored:return
        if self.in_title:self.title.append(data)
        self.parts.append(data)
        if self.anchor:self.anchor[1].append(data)

def read_page(url):
    env={k:v for k,v in os.environ.items() if k.lower() not in ('http_proxy','https_proxy','all_proxy','no_proxy')}
    for redirect in range(5):
        host=checked_url(url);address=resolve_public(host)
        folder=ROOT/'runtime/public-page-temp';folder.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=folder) as temp:
            header=os.path.join(temp,'headers.txt')
            args=['curl.exe','--silent','--show-error','--proto','=https','--noproxy','*','--resolve',host+':443:'+address,'--max-time','20','--max-filesize','2097152','--dump-header',header,'--user-agent','Dafeiyu-PublicReader/1.0',url]
            result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=25,env=env,creationflags=0x08000000)
            if result.returncode:raise RuntimeError('Public page transport failed')
            headers=Path(header).read_text(encoding='iso-8859-1');blocks=re.split(r'\r?\n\r?\n',headers.strip());last=blocks[-1]
            status=int(last.splitlines()[0].split()[1]);fields={line.split(':',1)[0].lower():line.split(':',1)[1].strip() for line in last.splitlines()[1:] if ':' in line}
        if status in (301,302,303,307,308):url=urljoin(url,fields.get('location',''));continue
        if status!=200:raise RuntimeError('Public page returned HTTP '+str(status))
        if not fields.get('content-type','').lower().startswith(('text/html','text/plain','application/xhtml+xml')):raise ValueError('Not a readable text page')
        if len(result.stdout)>2097152:raise ValueError('Page exceeds size limit')
        charset=re.search(r'charset=([\w-]+)',fields.get('content-type',''),re.I)
        parser=PageText();parser.feed(result.stdout.decode(charset[1] if charset else 'utf-8',errors='replace'))
        text=re.sub(r'[ \t]+',' ',''.join(parser.parts));text=re.sub(r'\n\s*\n+','\n',text).strip()
        links=[];seen=set()
        for row in parser.links:
            link=urljoin(url,row['url'])
            if row['text'] and link.startswith('https://') and link not in seen:
                links.append({'url':link,'text':row['text']});seen.add(link)
        links.sort(key=lambda row:0 if re.search(r'/(posts?|articles?)/',urlsplit(row['url']).path) else 1)
        return {'url':url,'title':''.join(parser.title).strip()[:500],'text':text[:18000],'text_truncated':len(text)>18000,'full_text_char_count':len(text),'links':links[:40],'source':'actual_public_https_response','untrusted_content':True,'http_status':status}
    raise ValueError('Too many public page redirects')

if __name__=='__main__':print(json.dumps(read_page(sys.argv[1]),ensure_ascii=False))
