param([switch]$CheckOnly,[switch]$KeepImages)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'launcher-admin.ps1')
if(-not $CheckOnly){$flags=@();if($KeepImages){$flags+='-KeepImages'};Invoke-ElevatedLauncher $PSCommandPath $flags}
$root=Split-Path $PSScriptRoot -Parent
$node=Join-Path $root 'snowluma\node.exe'
$mutex=New-Object System.Threading.Mutex($false,'Local\DafeiyuQQ-StartAll')
$locked=$false
function Service-Name($p){
 $cmd=[string]$p.CommandLine
 if($p.ExecutablePath -eq $node){
  if($cmd -match [regex]::Escape((Join-Path $root 'qq-bridge\src\mcp-owner-phone.js')) -or $cmd -match [regex]::Escape((Join-Path $root 'tutorial-kit\packages\phone-mcp\src\phone-mcp.js'))){return 'Phone tools'}
  if($cmd -match [regex]::Escape((Join-Path $root 'qq-bridge\src\mcp-owner.js'))){return 'Owner tools'}
  if($cmd -match '(?:^|["\s\\/])bridge\.js(?:["\s]|$)'){return 'Bridge'}
  if($cmd -match '(?:^|["\s\\/])index\.mjs(?:["\s]|$)'){return 'Gateway'}
 }
 if($p.ExecutablePath -eq '__DSH_ROOT__\DeepSeek Harness.exe' -and $cmd -match '--profile\s+dafeiyuqq(?:\s|$)' -and $cmd -match 'dsh-desktop-host'){return 'DSH'}
 if(-not $KeepImages -and $p.ExecutablePath -eq '__COMFY_ROOT__\python_embeded\python.exe' -and $cmd -match 'ComfyUI[\\/]main\.py'){return 'Images'}
 if($cmd -match ([regex]::Escape('__VOICE_ROOT__\qwen3\')+'(?:server|worker)\.py') -and $p.Name -eq 'python.exe'){return 'Voice'}
 return $null
}
try{
 $locked=$mutex.WaitOne(0)
 if(-not $locked){throw 'Launcher is busy. Try again after startup finishes.'}
 $all=@(Get-CimInstance Win32_Process)
 $targets=@($all | Where-Object {Service-Name $_})
 & (Join-Path $PSScriptRoot 'wechat-stack.ps1') -Action Stop -CheckOnly:$CheckOnly
 if(-not $CheckOnly){
  try{
   $cfg=Get-Content -LiteralPath (Join-Path $root 'qq-bridge\config.json') -Raw -Encoding UTF8|ConvertFrom-Json
   $token=([string]$cfg.consoleToken).Trim()
   if($token -cnotmatch '^[A-Za-z0-9_-]{16,128}$'){$token=(Get-Content -LiteralPath (Join-Path $root 'qq-bridge\state\console-token') -Raw).Trim()}
   $null=Invoke-RestMethod 'http://127.0.0.1:3100/api/douyin-auto' -Method Post -ContentType 'application/json' -Body '{"action":"disconnect"}' -Headers @{'X-Console-Token'=$token} -TimeoutSec 10
   Write-Host '[STOP] Douyin replies and protocol connection stopped.'
  }catch{Write-Host '[INFO] Douyin disconnect unavailable; stopping Bridge will close its connection.'}
 }
 foreach($p in ($targets | Sort-Object @{Expression={switch(Service-Name $_){'Bridge'{0};'DSH'{1};'Voice'{2};'Images'{3};default{4}}}},CreationDate)){
  $name=Service-Name $p
  if($CheckOnly){Write-Host "[CHECK] $name PID $($p.ProcessId)";continue}
  $live=Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ProcessId)"
  if(-not $live){continue}
  if($live.CreationDate -ne $p.CreationDate -or (Service-Name $live) -ne $name){throw 'Process identity changed; refused to stop it.'}
  Stop-Process -Id $p.ProcessId -ErrorAction Stop
  Write-Host "[STOP] $name PID $($p.ProcessId)"
 }
 if(-not $CheckOnly){
  Start-Sleep -Seconds 2
  $remaining=@(Get-CimInstance Win32_Process | Where-Object {Service-Name $_})
  if($remaining.Count){throw 'Some services are still running. Run this script again and inspect the output.'}
  Write-Host '[OK] Dafeiyu services stopped. QQ, WeChat and Clash remain open.'
 }
 exit 0
}catch{Write-Host ('[ERROR] '+$_.Exception.Message) -ForegroundColor Red;exit 1}
finally{if($locked){$mutex.ReleaseMutex()};$mutex.Dispose()}
