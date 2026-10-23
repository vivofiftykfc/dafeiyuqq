$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$bridge=Join-Path $root 'qq-bridge'
try{
 $cfg=Get-Content (Join-Path $bridge 'config.json') -Raw -Encoding UTF8|ConvertFrom-Json
 $token=([string]$cfg.consoleToken).Trim()
 if($token.Length -lt 16 -or $token.Length -gt 128 -or $token -cnotmatch '^[A-Za-z0-9_-]+$'){$token=(Get-Content (Join-Path $bridge 'state\console-token') -Raw).Trim()}
 $port=if($null -ne $cfg.consolePort){[int]$cfg.consolePort}else{3100}
 $base="http://127.0.0.1:$port"
 $headers=@{'X-Console-Token'=$token}
 $reply=Invoke-RestMethod "$base/api/restart" -Method Post -ContentType 'application/json' -Body '{}' -Headers $headers -TimeoutSec 10
 if(-not $reply.ok){throw 'Bridge refused restart'}
 Start-Sleep -Seconds 3
 $running=$false
 try{$null=Invoke-RestMethod "$base/api/status" -Headers $headers -TimeoutSec 2;$running=$true}catch{}
 if(-not $running){
  $node=Join-Path $root 'snowluma\node.exe'
  Start-Process -FilePath $node -ArgumentList 'src\bridge.js' -WorkingDirectory $bridge -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'logs\bridge-ui-restart.out.log') -RedirectStandardError (Join-Path $root 'logs\bridge-ui-restart.err.log')|Out-Null
 }
 for($i=0;$i -lt 30;$i++){
  try{$auto=Invoke-RestMethod "$base/api/douyin-auto" -Headers $headers -TimeoutSec 2;if($auto.ok -and $auto.transport -eq 'direct' -and $auto.rosterVersion -eq 1 -and $auto.mediaCapabilities.vision){$management=Invoke-RestMethod "$base/api/manage/status" -Headers $headers -TimeoutSec 5;if(-not $management.ok){throw 'Management API not loaded'};Write-Host "[OK] Open $base/#wechat-manage or #memory-manage (Douyin replies OFF)";exit 0}}catch{}
  Start-Sleep -Seconds 1
 }
 throw 'Douyin API is not ready. Check logs\bridge-ui-restart.err.log.'
}catch{Write-Host ('[ERROR] '+$_.Exception.Message);exit 1}
