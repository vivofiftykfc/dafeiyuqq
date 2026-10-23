"""MaiBot -> local OpenClaw action delegate, no shell and no WeChat tools."""
import asyncio
import json
import os
from pathlib import Path
from mcp.server.fastmcp import FastMCP

ROOT=Path(__file__).resolve().parents[1]
CLI=Path.home()/'AppData/Roaming/npm/node_modules/openclaw/openclaw.mjs'
mcp=FastMCP('dafeiyu_openclaw')
action_lock=asyncio.Lock()

@mcp.tool()
async def dafeiyu_openclaw(task:str)->str:
    """让 OpenClaw 自主整理本地笔记、写日记或制定计划。只能访问大肥鱼独立工作区，不可操作微信、系统或外部账号。不要传入密钥。"""
    async with action_lock:
        return await run_action(task)

async def run_action(task:str)->str:
    if not task.strip() or len(task)>6000:raise ValueError('Task must be 1-6000 characters')
    cfg=json.loads((ROOT/'local/config.json').read_text(encoding='utf-8-sig'))
    env=os.environ.copy();env.update(OPENCLAW_STATE_DIR=str(ROOT/'runtime/openclaw-state'),OPENCLAW_CONFIG_PATH=str(ROOT/'runtime/openclaw-state/openclaw.json'),REPLACE_WITH_LOCAL_TOKEN=cfg['api_key'])
    for name,folder in [('USERPROFILE','claw-home'),('LOCALAPPDATA','claw-localappdata'),('TEMP','claw-temp'),('TMP','claw-temp')]:
        path=ROOT/'runtime'/folder;path.mkdir(exist_ok=True);env[name]=str(path)
    proc=await asyncio.create_subprocess_exec('node',str(CLI),'agent','--local','--agent','main','--session-id','dafeiyu-local-actions','--message',task,'--json',stdin=asyncio.subprocess.DEVNULL,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE,env=env,cwd=str(ROOT/'runtime/claw-workspace'),creationflags=0x08000000)
    try:out,err=await asyncio.wait_for(proc.communicate(),timeout=240)
    except TimeoutError:
        proc.kill();await proc.wait();raise RuntimeError('OpenClaw timeout; action outcome requires inspection, do not blindly retry')
    if proc.returncode:raise RuntimeError('OpenClaw failed: '+err.decode('utf-8',errors='replace')[-1500:].replace(cfg['api_key'],'[redacted]'))
    result=json.loads(out.decode('utf-8'))
    meta=result.get('meta',{})
    return json.dumps({'reply':meta.get('finalAssistantVisibleText') or result.get('payloads'), 'tools':meta.get('toolSummary',{}),'aborted':meta.get('aborted',False)},ensure_ascii=False)

if __name__=='__main__':mcp.run(transport='stdio')
