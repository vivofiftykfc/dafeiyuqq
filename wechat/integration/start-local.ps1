param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$env:HF_HUB_DISABLE_TELEMETRY = '1'
$python = Join-Path $root 'runtime\MaiBot\.venv\Scripts\python.exe'
function Get-Health($url) {
    try { return Invoke-RestMethod -Uri $url -TimeoutSec 3 } catch { return $null }
}
function Wait-Ready($url) {
    for ($i=0; $i -lt 60; $i++) { if (Get-Health $url) {return}; Start-Sleep -Seconds 1 }
    throw "Service did not start: $url. See runtime logs."
}
$embedding = Get-Health 'http://127.0.0.1:18002/health'
if ($embedding -and $embedding.model -ne 'BAAI/bge-small-zh-v1.5') {throw 'Port 18002 belongs to a different service'}
if (-not $embedding) {
    $proc = Start-Process -FilePath (Join-Path $root 'runtime\services-env\Scripts\python.exe') -ArgumentList @('-X','utf8',('"'+(Join-Path $PSScriptRoot 'embedding_server.py')+'"')) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'runtime\embedding.log') -RedirectStandardError (Join-Path $root 'runtime\embedding.err.log') -PassThru
    $proc.Id | Set-Content (Join-Path $root 'runtime\embedding.pid')
    Wait-Ready 'http://127.0.0.1:18002/health'
}
if (-not (Get-Health 'http://127.0.0.1:18001/')) { & (Join-Path $PSScriptRoot 'start-mai.ps1'); Wait-Ready 'http://127.0.0.1:18001/' }
$isolation = Join-Path $root 'runtime\isolation.json'
if ((Test-Path -LiteralPath $isolation) -and -not (Get-Health 'http://127.0.0.1:18011/')) {
    $groupInstance = (Get-Content -LiteralPath $isolation -Raw -Encoding UTF8 | ConvertFrom-Json).conversations.group.instance
    $proc = Start-Process -FilePath $python -ArgumentList @('-X','utf8','-m','src.cli.tool','run','--directory',('"'+$groupInstance+'"')) -WorkingDirectory (Join-Path $root 'runtime\MaiBot') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'runtime\group-mai.log') -RedirectStandardError (Join-Path $root 'runtime\group-mai.err.log') -PassThru
    $proc.Id | Set-Content (Join-Path $root 'runtime\group-mai.pid')
    Wait-Ready 'http://127.0.0.1:18011/'
}
$ui = Get-Health 'http://127.0.0.1:18003/health'
if ($ui -and $ui.service -ne 'dafeiyu-chat') {throw 'Port 18003 belongs to a different service'}
if (-not $ui) {
    $proc = Start-Process -FilePath $python -ArgumentList @('-X','utf8',('"'+(Join-Path $PSScriptRoot 'chat_server.py')+'"')) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'runtime\chat-ui.log') -RedirectStandardError (Join-Path $root 'runtime\chat-ui.err.log') -PassThru
    $proc.Id | Set-Content (Join-Path $root 'runtime\chat-ui.pid')
    Wait-Ready 'http://127.0.0.1:18003/health'
}
Write-Output 'Dafeiyu: http://127.0.0.1:18003'
$ownerOps = Get-Health 'http://127.0.0.1:18004/health'
if ($ownerOps -and $ownerOps.service -ne 'dafeiyu-owner-ops') {throw 'Port 18004 belongs to a different service'}
if ((Test-Path -LiteralPath (Join-Path $root 'runtime\owner-ops.json')) -and -not $ownerOps) {
    $proc = Start-Process -FilePath $python -ArgumentList @('-X','utf8',('"'+(Join-Path $PSScriptRoot 'owner_ops.py')+'"')) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'runtime\owner-ops.log') -RedirectStandardError (Join-Path $root 'runtime\owner-ops.err.log') -PassThru
    $proc.Id | Set-Content (Join-Path $root 'runtime\owner-ops.pid')
    Wait-Ready 'http://127.0.0.1:18004/health'
}
$media = Get-Health 'http://127.0.0.1:18005/health'
if ($media -and $media.service -ne 'dafeiyu-media') {throw 'Port 18005 belongs to a different service'}
if (-not $media) {
    $proc = Start-Process -FilePath $python -ArgumentList @('-X','utf8',('"'+(Join-Path $PSScriptRoot 'media_service.py')+'"')) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'runtime\media.log') -RedirectStandardError (Join-Path $root 'runtime\media.err.log') -PassThru
    $proc.Id | Set-Content (Join-Path $root 'runtime\media.pid')
    Wait-Ready 'http://127.0.0.1:18005/health'
}
if (Test-Path (Join-Path $root 'local/tavern.json')) {
    $tavernConfig=Get-Content (Join-Path $root 'local/tavern.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if($tavernConfig.enabled_scopes.Count -gt 0){ & (Join-Path $PSScriptRoot 'start-tavern.ps1') }
}
$completed = @{checked_at=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds();start_script_completed=$true;scope='local services only; no WeChat account operation'} | ConvertTo-Json -Compress
[IO.File]::WriteAllText((Join-Path $root 'runtime/backend-start-last.json'),$completed,[Text.UTF8Encoding]::new($false))
if (-not $NoBrowser) {Start-Process 'http://127.0.0.1:18003'}
