param([switch]$CheckOnly,[switch]$StatusOnly,[switch]$SkipImages,[switch]$SkipDouyinReplies)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'launcher-admin.ps1')
if(-not $CheckOnly -and -not $StatusOnly){
 $principal=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
 if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
  # The owner action broker refuses elevation. Start ordinary backends BEFORE UAC.
  try{& '__PROJECT_ROOT__/wechat\integration\start-local.ps1' -NoBrowser}
  catch{Write-Host '[WARN] Ordinary WeChat backends need attention; continuing independent channels.' -ForegroundColor Yellow}
 }
}
if(-not $CheckOnly -and -not $StatusOnly){$flags=@();if($SkipImages){$flags+='-SkipImages'};if($SkipDouyinReplies){$flags+='-SkipDouyinReplies'};Invoke-ElevatedLauncher $PSCommandPath $flags}
$root=Split-Path $PSScriptRoot -Parent
$logs=Join-Path $root 'logs'
$node=Join-Path $root 'snowluma\node.exe'
$dsh='__DSH_ROOT__\DeepSeek Harness.exe'
$dshCli='__DSH_ROOT__\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh-desktop-host\lib\cli.js'
$comfy='__COMFY_ROOT__'
$mutex=New-Object System.Threading.Mutex($false,'Local\DafeiyuQQ-StartAll')
$locked=$false
function Port-Open([int]$Port){
 $client=New-Object System.Net.Sockets.TcpClient
 try{return $client.ConnectAsync('127.0.0.1',$Port).Wait(400) -and $client.Connected}catch{return $false}finally{$client.Dispose()}
}
function Wait-Port([int]$Port,[string]$Name,$Child){
 for($i=0;$i -lt 60;$i++){
  if(Port-Open $Port){Write-Host "[OK] $Name ready on $Port";return}
  if($Child -and $Child.HasExited){throw "$Name exited. See logs in $logs"}
  if($i % 5 -eq 0){Write-Host "[WAIT] $Name starting..."}
  Start-Sleep -Seconds 2
 }
 throw "$Name did not become ready. See logs in $logs"
}
function Start-ServiceProcess([string]$Name,[string]$Exe,[string]$Arguments,[string]$Cwd){
 $out=Join-Path $logs ($Name+'.out.log');$err=Join-Path $logs ($Name+'.err.log')
 foreach($file in @($out,$err)){if(Test-Path -LiteralPath $file){Copy-Item -LiteralPath $file -Destination ($file+'.previous') -Force}}
 return Start-Process -FilePath $Exe -ArgumentList $Arguments -WorkingDirectory $Cwd -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
}
function Show-Status{
 & (Join-Path $PSScriptRoot 'wechat-stack.ps1') -Action Status
 foreach($service in @(@('DSH',18031),@('Gateway UI',5099),@('QQ HTTP',3000),@('QQ WebSocket',3001),@('Bridge',3100),@('Images',8188),@('Voice',18034))){
  $state=if(Port-Open $service[1]){'UP'}else{'DOWN'}
  Write-Host ('[{0}] {1} : {2}' -f $state,$service[0],$service[1])
 }
 if(Port-Open 3100){
  try{
   $cfg=Get-Content -LiteralPath (Join-Path $root 'qq-bridge\config.json') -Raw -Encoding UTF8|ConvertFrom-Json
   $token=([string]$cfg.consoleToken).Trim()
   if($token -cnotmatch '^[A-Za-z0-9_-]{16,128}$'){$token=(Get-Content -LiteralPath (Join-Path $root 'qq-bridge\state\console-token') -Raw).Trim()}
   $status=Invoke-RestMethod 'http://127.0.0.1:3100/api/status' -Headers @{'X-Console-Token'=$token} -TimeoutSec 8
   Write-Host ("Bridge mode: {0}; DSH ready: {1}" -f $status.mode,$status.dshReady)
   $dy=Invoke-RestMethod 'http://127.0.0.1:3100/api/douyin-auto' -Headers @{'X-Console-Token'=$token} -TimeoutSec 8
   if($dy.transport -eq 'direct'){Write-Host ("Douyin direct: connected={0}; auto-reply={1}; {2}" -f $dy.connected,$dy.enabled,$dy.phase)}else{Write-Host '[ACTION] Restart Bridge to load Douyin direct transport.'}
  }catch{Write-Host '[WARN] Bridge status endpoint is not ready.'}
 }
 try{
  $ob=Get-Content -LiteralPath (Join-Path $root 'snowluma\config\onebot_10000002.json') -Raw -Encoding UTF8|ConvertFrom-Json
  $http=$ob.networks.httpServers[0]
  if($http.host -ne '127.0.0.1'){throw 'Unexpected gateway host'}
  $me=Invoke-RestMethod ('http://127.0.0.1:{0}/get_login_info' -f $http.port) -Method Post -Headers @{Authorization=('Bearer '+$http.accessToken)} -ContentType 'application/json' -Body '{}' -TimeoutSec 8
  if($me.status -ne 'ok' -or [string]$me.data.user_id -ne '10000002'){throw 'Bot account is not connected'}
  Write-Host '[OK] Bot QQ 10000002 is connected.'
 }catch{
  Write-Host '[ACTION] Log in to bot QQ 10000002, then load ONLY that account in the gateway.' -ForegroundColor Yellow
  Write-Host 'Gateway: http://127.0.0.1:5099'
 }
}
function Show-BridgeLogin{
 $cfg=Get-Content -LiteralPath (Join-Path $root 'qq-bridge\config.json') -Raw -Encoding UTF8|ConvertFrom-Json
 $token=([string]$cfg.consoleToken).Trim()
 if($token.Length -lt 16 -or $token.Length -gt 128 -or $token -cnotmatch '^[A-Za-z0-9_-]+$'){
  $tokenFile=Join-Path $root 'qq-bridge\state\console-token'
  $token=if(Test-Path -LiteralPath $tokenFile){(Get-Content -LiteralPath $tokenFile -Raw -Encoding UTF8).Trim()}else{''}
 }
 $port=if($null -ne $cfg.consolePort){$cfg.consolePort}else{3100}
 Write-Host ("QQ Bridge console: http://127.0.0.1:{0}" -f $port) -ForegroundColor Cyan
 if($token){Write-Host ("QQ Bridge console token: {0}" -f $token) -ForegroundColor Cyan}
 else{Write-Host '[WARN] QQ Bridge console token is not available yet.' -ForegroundColor Yellow}
}
try{
 if($StatusOnly){Show-Status;exit 0}
 $locked=$mutex.WaitOne(0)
 if(-not $locked){Write-Host 'Another launcher is already running.';exit 0}
 $required=@($node,$dsh,(Join-Path $root 'snowluma\index.mjs'),(Join-Path $root 'qq-bridge\src\bridge.js'),(Join-Path $root 'qq-bridge\config.json'))
 $required+=@(Join-Path $root 'qq-bridge\src\douyin-direct.js');$required+=@(Join-Path $root 'tools\douyin-im\lib\index.js')
 $required+=@(Join-Path $PSScriptRoot 'start-douyin-bot.mjs')
 if(-not $SkipImages){$required+=@(Join-Path $comfy 'python_embeded\python.exe');$required+=@(Join-Path $comfy 'ComfyUI\main.py')}
 foreach($file in $required){if(-not(Test-Path -LiteralPath $file)){throw "Missing file: $file"}}
 if($CheckOnly){& (Join-Path $PSScriptRoot 'wechat-stack.ps1') -Action Start -CheckOnly;Write-Host '[OK] Launcher paths checked. No services were started.';Show-Status;exit 0}
 New-Item -ItemType Directory -Force -Path $logs|Out-Null
 Write-Host 'Starting Dafeiyu QQ...'
 if(Port-Open 18031){Write-Host '[SKIP] DSH is already running.'}else{
  $old=$env:ELECTRON_RUN_AS_NODE
  try{$env:ELECTRON_RUN_AS_NODE='1';$child=Start-ServiceProcess 'dsh' $dsh ('--expose-internals "{0}" --profile dafeiyuqq --host 127.0.0.1 --port 18031 --no-open' -f $dshCli) $root}finally{$env:ELECTRON_RUN_AS_NODE=$old}
  Wait-Port 18031 'DSH' $child
 }
 if(Port-Open 5099){Write-Host '[SKIP] Gateway is already running.'}else{
  $old=$env:SNOWLUMA_WEBUI_HOST
  try{$env:SNOWLUMA_WEBUI_HOST='127.0.0.1';$child=Start-ServiceProcess 'gateway' $node 'index.mjs' (Join-Path $root 'snowluma')}finally{$env:SNOWLUMA_WEBUI_HOST=$old}
  Wait-Port 5099 'Gateway' $child
 }
 if(Port-Open 3100){Write-Host '[SKIP] Bridge is already running.'}else{
  Push-Location (Join-Path $root 'qq-bridge')
  try{& $node 'scripts\import-whale-pack.mjs';if($LASTEXITCODE -ne 0){throw 'Sticker import failed; an old bridge may still be starting.'}}finally{Pop-Location}
  $child=Start-ServiceProcess 'bridge' $node 'src\bridge.js' (Join-Path $root 'qq-bridge')
  Wait-Port 3100 'Bridge' $child
 }
 $douyinArgs=@(Join-Path $PSScriptRoot 'start-douyin-bot.mjs')
 if($SkipDouyinReplies){$douyinArgs+='--connect-only'}
 & $node @douyinArgs
 if($LASTEXITCODE -ne 0){Write-Host '[WARN] Douyin needs attention; continuing other services.' -ForegroundColor Yellow}
 if(-not $SkipImages){
  if(Port-Open 8188){Write-Host '[SKIP] Image service is already running.'}else{
   $child=Start-ServiceProcess 'comfy' (Join-Path $comfy 'python_embeded\python.exe') '-s ComfyUI\main.py --windows-standalone-build --listen 127.0.0.1 --port 8188 --disable-auto-launch' $comfy
   Wait-Port 8188 'Images' $child
  }
 }
 if(Test-Path '__VOICE_ROOT__\qwen3\voices.json'){
  if(Port-Open 18034){Write-Host '[SKIP] Voice service is already running.'}else{
   $child=Start-ServiceProcess 'voice' '__VOICE_ROOT__\qwen3\venv\Scripts\python.exe' '__VOICE_ROOT__\qwen3\server.py' '__VOICE_ROOT__\qwen3'
   Wait-Port 18034 'Voice' $child
  }
 }
 & (Join-Path $PSScriptRoot 'wechat-stack.ps1') -Action Start
 Show-Status
 Write-Host ''
 Write-Host 'Services run in the background. You may close this window.' -ForegroundColor Green
 Write-Host "Logs: $logs"
 Show-BridgeLogin
 Write-Host 'Douyin startup checks connection and enables only the previously allowed friends. Use -SkipDouyinReplies for connection-only maintenance.' -ForegroundColor Cyan
 Write-Host 'Douyin controls: http://127.0.0.1:3100/#douyin-auto' -ForegroundColor Cyan
 exit 0
}catch{
 Write-Host ('[ERROR] '+$_.Exception.Message) -ForegroundColor Red
 Write-Host 'Already running services were not stopped. Fix the issue and launch again.'
 exit 1
}finally{
 if($locked){$mutex.ReleaseMutex()};$mutex.Dispose()
}
