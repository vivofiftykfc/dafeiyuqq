"""Persistent DSH stdio client. Uses the installed runtime, never drives WeChat itself.

Wire contract: deepseek-ai/deepseek-harness/packages/sdk/protocol.
Harness home is project-owned; credentials are resolved by DSH, never read here.
"""
import asyncio,json,os,tempfile
from pathlib import Path
from collections import defaultdict

ROOT=Path(__file__).resolve().parents[1]
APP=Path('__DSH_ROOT__')

def assistant_text(event):
    if event.get('type')!='assistant/message':return ''
    data=event.get('data',{})
    message=data.get('message',data) if isinstance(data,dict) else {}
    blocks=message.get('content',[]) if isinstance(message,dict) else []
    return ''.join(block.get('text','') for block in blocks if block.get('type')=='text')

class Runtime:
    def __init__(self,root=ROOT,patch=None,workspace=None,model='deepseek-flash',profile='dafeiyu-sdk'):
        self.root=root;self.patch=patch;self.pending={};self.sequence=0;self.events=defaultdict(list);self.process=None;self.diagnostics=[]
        self.workspace=Path(workspace) if workspace is not None else self.root/'runtime/dsh-workspace'
        if model not in ('deepseek-flash','deepseek-v4-pro'):raise ValueError('Unsupported configured DSH model')
        self.model=model
        if profile not in ('dafeiyu-sdk','dafeiyu-browser-eval'):raise ValueError('Unknown project-owned DSH profile')
        self.profile=profile
    async def start(self):
        if self.process:raise RuntimeError('DSH runtime already started')
        temporary=self.root/'runtime/dsh-temp';temporary.mkdir(exist_ok=True)
        # The supervised ST child cannot write the machine Temp directory.
        # asyncio's Windows pipes also need this in the caller, before spawning.
        tempfile.tempdir=str(temporary)
        env=dict(os.environ,ELECTRON_RUN_AS_NODE='1',DSH_HOME=str(self.root/'runtime/dsh-home'))
        env.update(TEMP=str(temporary),TMP=str(temporary))
        if self.profile=='dafeiyu-browser-eval':
            browser_temp=self.workspace/'.browser-tmp';browser_temp.mkdir(parents=True,exist_ok=True)
            browser_local=self.workspace/'.browser-local';browser_local.mkdir(parents=True,exist_ok=True)
            env.update(TEMP=str(browser_temp),TMP=str(browser_temp),LOCALAPPDATA=str(browser_local),PLAYWRIGHT_BROWSERS_PATH=str(self.workspace/'.browser-runtime'))
        command=[str(APP/'DeepSeek Harness.exe'),'--expose-internals',str(APP/'resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js'),'--profile',self.profile]
        if self.patch:command+=['--patch',str(self.patch)]
        self.workspace.mkdir(parents=True,exist_ok=True)
        self.process=await asyncio.create_subprocess_exec(*command,cwd=self.workspace,env=env,stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE,limit=8*1024*1024)
        self.reader=asyncio.create_task(self._read());self.stderr=asyncio.create_task(self._diagnostics())
        result=await self.request('initialize',dict(cwd=str(self.workspace),provider='deepseek-account',model=self.model,reasoningEffort='high',maxTokens=4096),timeout=35)
        if result.get('serverInfo',{}).get('name')!='deepseek-harness-sdk-runtime':raise RuntimeError('Unexpected SDK server')
        return result
    async def _diagnostics(self):
        while line:=await self.process.stderr.readline():
            # Diagnostics are bounded and kept in memory, never printed with credentials or prompts.
            self.diagnostics.append(line.decode('utf-8',errors='replace')[:1500]);self.diagnostics=self.diagnostics[-30:]
    async def _read(self):
        failure=RuntimeError('DSH process disconnected; submitted result is unknown')
        try:
            while line:=await self.process.stdout.readline():
                if not line.lstrip().startswith(b'{'):
                    # Account discovery on the installed build logs on stdout.
                    # Never mistake it for a wire event or expose it to the character.
                    self.diagnostics.append('non-protocol stdout omitted');self.diagnostics=self.diagnostics[-30:]
                    continue
                row=json.loads(line)
                if 'id' in row:
                    future=self.pending.pop(row['id'],None)
                    if future is None or future.done():continue
                    if 'error' in row:future.set_exception(RuntimeError('DSH RPC rejected: '+str(row['error'].get('message','unknown error'))))
                    else:future.set_result(row.get('result',{}))
                elif row.get('method')=='session.event':
                    params=row.get('params',{});event=params.get('event',{})
                    if event.get('type') in ('assistant/message','turn/end','tool/call','tool/result'):
                        records=self.events[params.get('sessionId')];records.append(event)
                        if len(records)>2000:del records[:1000]
        except Exception as error:failure=error
        finally:
            for future in list(self.pending.values()):
                if not future.done():future.set_exception(failure)
            self.pending.clear()
    async def request(self,method,params=None,timeout=120):
        if not self.process or self.process.returncode is not None:raise RuntimeError('DSH runtime not live')
        self.sequence+=1;identity=self.sequence;future=asyncio.get_running_loop().create_future();self.pending[identity]=future
        self.process.stdin.write((json.dumps(dict(jsonrpc='2.0',id=identity,method=method,params=params or {}),ensure_ascii=False)+'\n').encode('utf-8'))
        await self.process.stdin.drain()
        try:return await asyncio.wait_for(future,timeout)
        finally:self.pending.pop(identity,None)
    async def run(self,session,text,*,image=None,images=None):
        # Caller owns durable submission identity and recovery. Never retry unknown requests here.
        self.events[session].clear()
        blocks=[dict(type='text',text=text)]
        if image:blocks.append(image)
        if images:blocks.extend(images)
        receipt=await self.request('session/prompt',dict(sessionId=session,contentBlocks=blocks),timeout=20)
        await self.request('session/wait',dict(sessionId=session),timeout=180)
        events=list(self.events[session]);texts=[assistant_text(row) for row in events]
        terminals=[row for row in events if row.get('type')=='turn/end']
        reason=terminals[-1].get('data',{}).get('reason',{}).get('kind') if terminals else None
        return dict(session=session,message_id=receipt.get('messageId'),text=next((text for text in reversed(texts) if text),''),finish_reason=reason,event_shapes=[dict(type=row.get('type'),keys=list(row.get('data',{})) if isinstance(row.get('data'),dict) else []) for row in events])
    async def close(self):
        if not self.process:return
        if self.process.returncode is None:
            try:await self.request('shutdown',timeout=10)
            except Exception:pass
            try:await asyncio.wait_for(self.process.wait(),5)
            except asyncio.TimeoutError:
                # Only this owned runtime tree; no global node/Electron/WeChat termination.
                stop=await asyncio.create_subprocess_exec('taskkill','/PID',str(self.process.pid),'/T','/F',stdout=asyncio.subprocess.DEVNULL,stderr=asyncio.subprocess.DEVNULL)
                await stop.wait();await self.process.wait()
        await asyncio.gather(self.reader,self.stderr,return_exceptions=True)
