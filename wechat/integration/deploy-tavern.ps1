param([switch]$KeepBridge)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
if ((Test-Path -LiteralPath (Join-Path $root 'local/autonomy.json')) -and -not ([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))) {
 $hostPolicy=Get-Content -LiteralPath (Join-Path $root 'local/autonomy.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 if($hostPolicy.host_access -eq 'full'){
  Set-Content -LiteralPath (Join-Path $root 'runtime/tavern-host-reload.request') -Value 'deploy-from-authorized-local-service' -Encoding UTF8
  Write-Output 'Deployment queued for the authorized local service at idle; check runtime/tavern-host-deployment.json for completion.'
  return
 }
}
$instance='__TAVERN_ROOT__'
$queue=Get-Content (Join-Path $root 'runtime/tavern-jobs.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if(@($queue.PSObject.Properties.Value | Where-Object {$_.state -in @('pending','running')}).Count){throw 'Tavern busy; deployment deferred'}
$busy=Get-Content (Join-Path $root 'runtime/bridge-busy.json') -Raw | ConvertFrom-Json
if($busy.jobs -gt 0){throw 'WeChat bridge busy; deployment deferred'}
$listener=Get-NetTCPConnection -LocalPort 18020 -State Listen
$server=Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
if($server.Name -ne 'node.exe' -or $server.CommandLine -notlike '*server.js*'){throw 'Unexpected service on port 18020'}
$backup=Join-Path $root ('runtime/backups/tavern-deploy-'+(Get-Date -Format yyyyMMdd-HHmmss))
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item -LiteralPath (Join-Path $instance 'plugins/dafeiyu/index.mjs') -Destination (Join-Path $backup 'plugin-index.mjs')
if(Test-Path -LiteralPath (Join-Path $instance 'plugins/dafeiyu/queue-policy.mjs')){Copy-Item -LiteralPath (Join-Path $instance 'plugins/dafeiyu/queue-policy.mjs') -Destination (Join-Path $backup 'queue-policy.mjs')}
Copy-Item -LiteralPath (Join-Path $instance 'public/scripts/extensions/third-party/dafeiyu/index.js') -Destination (Join-Path $backup 'extension-index.js')
Copy-Item -LiteralPath (Join-Path $root 'runtime/tavern-jobs.json') -Destination (Join-Path $backup 'tavern-jobs.json')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'tavern-plugin/index.mjs') -Destination (Join-Path $instance 'plugins/dafeiyu/index.mjs') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'tavern-plugin/queue-policy.mjs') -Destination (Join-Path $instance 'plugins/dafeiyu/queue-policy.mjs') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'tavern-plugin/speaker-identity.mjs') -Destination (Join-Path $instance 'plugins/dafeiyu/speaker-identity.mjs') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'tavern-extension/index.js') -Destination (Join-Path $instance 'public/scripts/extensions/third-party/dafeiyu/index.js') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'tavern-extension/history-view.mjs') -Destination (Join-Path $instance 'public/scripts/extensions/third-party/dafeiyu/history-view.mjs') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'tavern-extension/reply-delivery.mjs') -Destination (Join-Path $instance 'public/scripts/extensions/third-party/dafeiyu/reply-delivery.mjs') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'tavern-extension/manifest.json') -Destination (Join-Path $instance 'public/scripts/extensions/third-party/dafeiyu/manifest.json') -Force
Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object {$_.CommandLine -like '*tavern_worker.cjs*'} | ForEach-Object {Stop-Process -Id $_.ProcessId}
Stop-Process -Id $server.ProcessId
& (Join-Path $PSScriptRoot 'start-tavern.ps1')
if(-not $KeepBridge){Set-Content -LiteralPath (Join-Path $root 'runtime/wechat-bridge.reload') -Value 'tavern-update' -Encoding UTF8}
Write-Output "Deployed dedicated Tavern adapter; rollback files: $backup"
