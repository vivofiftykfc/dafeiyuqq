$ErrorActionPreference='Stop'
$env:SILLYTAVERN_SELENIUM_BROWSER='MicrosoftEdge'
$env:SILLYTAVERN_SELENIUM_HEADLESS='true'
$root=Split-Path $PSScriptRoot -Parent
$instance='__TAVERN_ROOT__'
$healthy=$false
try { $healthy=(Invoke-WebRequest 'http://127.0.0.1:18020/' -TimeoutSec 3).StatusCode -eq 200 } catch {}
if(-not $healthy){
 Start-Process node -ArgumentList 'server.js','--port','18020','--autorun','false' -WorkingDirectory $instance -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'runtime/tavern.log') -RedirectStandardError (Join-Path $root 'runtime/tavern.err.log') | Out-Null
}
$workers=Get-CimInstance Win32_Process | Where-Object {$_.Name -eq 'node.exe' -and $_.CommandLine -like '*tavern_worker.cjs*'}
if(-not $workers){
 Start-Process node -ArgumentList ('"'+(Join-Path $PSScriptRoot 'tavern_worker.cjs')+'"') -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'runtime/tavern-worker.log') -RedirectStandardError (Join-Path $root 'runtime/tavern-worker.err.log') | Out-Null
}
