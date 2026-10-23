param([ValidateSet('Start','Stop','Status')][string]$Action='Status',[switch]$CheckOnly)
$ErrorActionPreference='Stop'
$wechatRoot=(Join-Path (Split-Path $PSScriptRoot -Parent) 'wechat')
$python=Join-Path $wechatRoot 'runtime\wechat-env\Scripts\python.exe'
$bridgeScript=Join-Path $wechatRoot 'integration\wechat_bridge.py'
$runtime=Join-Path $wechatRoot 'runtime'
if($Action -ne 'Status' -and -not $CheckOnly){
 $principal=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
 if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Administrator access required. Use the desktop one-click launcher, then retry in the console.'}
}
function Native-Processes {
 @(Get-CimInstance Win32_Process | Where-Object {$_.Name -eq 'python.exe' -and ([string]$_.CommandLine).Contains($bridgeScript)})
}
function Get-NativeState {
 try {Get-Content (Join-Path $runtime 'wechat-bridge-state.json') -Raw -Encoding UTF8 | ConvertFrom-Json}catch{$null}
}
function Owned-Root($p){
 $cmd=[string]$p.CommandLine
 if($p.Name -eq 'python.exe' -and $cmd -match ([regex]::Escape($wechatRoot)+'[\\/]') -and $cmd -match '(wechat_bridge|host_executor|embedding_server|chat_server|owner_ops|media_service|dsh_generate)\.py|src\.cli\.tool'){return $true}
 if($p.Name -eq 'node.exe' -and $cmd.Contains((Join-Path $wechatRoot 'integration\tavern_worker.cjs'))){return $true}
 if($p.Name -eq 'node.exe' -and ($cmd.Contains('__TAVERN_ROOT__\server.js') -or ($cmd -match 'server\.js.*--port[ =]+18020(?:\s|$)' -and @(Get-NetTCPConnection -LocalPort 18020 -State Listen -ErrorAction SilentlyContinue | Where-Object OwningProcess -eq $p.ProcessId).Count))){return $true}
 return $false
}
if($Action -eq 'Status'){
 $running=@(Native-Processes);$state=Get-NativeState
 $visible=if($running.Count){[string]$running.Count}else{'not visible (may require administrator)'}
 Write-Host ('WeChat native: process={0}; last recorded state={1}' -f $visible,$state.state)
 return
}
foreach($file in @($python,$bridgeScript,(Join-Path $wechatRoot 'integration\start-local.ps1'),(Join-Path $wechatRoot 'integration\rebind_native_startup.py'))){if(-not(Test-Path -LiteralPath $file)){throw "Missing WeChat dependency: $file"}}
if($Action -eq 'Start'){
 if($CheckOnly){Write-Host '[CHECK] WeChat native and backend launcher paths verified.';return}
 # Do not launch the non-elevated action broker from this elevated native launcher.
 try{$health=Invoke-RestMethod 'http://127.0.0.1:18004/health' -TimeoutSec 3}catch{$health=$null}
 if(-not $health -or $health.service -ne 'dafeiyu-owner-ops'){throw 'Start the desktop one-click launcher normally first: ordinary backends must start before UAC elevation.'}
 & (Join-Path $wechatRoot 'integration\start-local.ps1') -NoBrowser
 if(@(Native-Processes).Count){
  $state=Get-NativeState
  if($state.state -eq 'running'){Write-Host '[SKIP] WeChat native is already running.';return}
  throw 'WeChat process exists but is not ready; inspect runtime/wechat-bridge.log.'
 }
 & $python -X utf8 (Join-Path $wechatRoot 'integration\rebind_native_startup.py')
 if($LASTEXITCODE -ne 0){
  $binding=Get-Content (Join-Path $wechatRoot 'local\binding.json') -Raw -Encoding UTF8|ConvertFrom-Json
  if(-not @(Get-Process Weixin -ErrorAction SilentlyContinue).Count){Start-Process -FilePath $binding.executable -WindowStyle Normal | Out-Null}
  throw 'WeChat alt needs login or identity verification. Other services remain running; log in, then launch again.'
 }
 $started=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
 $child=Start-Process powershell.exe -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File "'+(Join-Path $PSScriptRoot 'wechat-native-runner.ps1')+'"') -WorkingDirectory $wechatRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'wechat-launcher.out.log') -RedirectStandardError (Join-Path $runtime 'wechat-launcher.err.log') -PassThru
 for($i=0;$i -lt 60;$i++){
  $child.Refresh();if($child.HasExited){throw 'WeChat native exited; see runtime/wechat-launcher.err.log.'}
  $state=Get-NativeState
  $pidFile=Join-Path $runtime 'wechat-bridge.pid'
  if($state.state -eq 'running' -and $state.time -ge $started -and (Test-Path $pidFile) -and @(Native-Processes | Where-Object ProcessId -eq ([int](Get-Content $pidFile))).Count){Write-Host '[OK] WeChat native ready.';return}
  Start-Sleep -Seconds 1
 }
 throw 'WeChat native readiness timed out; inspect its logs.'
}
if($Action -eq 'Stop'){
 if(-not $CheckOnly){
  [IO.File]::WriteAllText((Join-Path $runtime 'wechat-bridge.stop'),'stop')
  for($i=0;$i -lt 45 -and @(Native-Processes).Count;$i++){Start-Sleep -Seconds 1}
  if(@(Native-Processes).Count){throw 'WeChat has not unloaded after 45 seconds. Refusing to force-kill its bridge; inspect its log and retry.'}
 }
 $all=@(Get-CimInstance Win32_Process);$targets=@{};
 foreach($p in $all){if(Owned-Root $p){$targets[[int]$p.ProcessId]=$p}}
 # Only verified descendants of these project service roots, never the WeChat client.
 do {$added=$false;foreach($p in $all){if(-not $targets.ContainsKey([int]$p.ProcessId) -and $targets.ContainsKey([int]$p.ParentProcessId) -and $p.CreationDate -ge $targets[[int]$p.ParentProcessId].CreationDate -and $p.Name -notmatch '^(Weixin|WeChat|QQ|Clash).*\.exe$'){$targets[[int]$p.ProcessId]=$p;$added=$true}}}while($added)
 foreach($p in @($targets.Values | Sort-Object CreationDate -Descending)){
  if($CheckOnly){Write-Host "[CHECK] WeChat service $($p.Name) PID $($p.ProcessId)";continue}
  $live=Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ProcessId)"
  if(-not $live){continue}
  if($live.CreationDate -ne $p.CreationDate -or $live.ExecutablePath -ne $p.ExecutablePath){throw 'WeChat service PID changed; refused to stop.'}
  Stop-Process -Id $live.ProcessId -ErrorAction Stop
 }
 if(-not $CheckOnly){Write-Host '[OK] WeChat bridge and project backends stopped; WeChat client remains open.'}
}
