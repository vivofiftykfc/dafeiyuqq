$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {throw 'Run this script in an Administrator PowerShell window.'}
$health = Invoke-RestMethod 'http://127.0.0.1:18005/health' -TimeoutSec 5
if ($health.service -ne 'dafeiyu-media') {throw 'Unexpected service on port 18005'}
$busy = Get-Content (Join-Path $root 'runtime/bridge-busy.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$jobs = Get-Content (Join-Path $root 'runtime/tavern-jobs.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($busy.jobs -gt 0 -or $health.collection_active -gt 0 -or @($jobs.PSObject.Properties.Value | Where-Object {$_.state -in @('pending','running')}).Count -gt 0) {throw 'Services are busy. Retry after the current conversation or drawing completes.'}
$listener = Get-NetTCPConnection -LocalPort 18005 -State Listen
$process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
$entry = Join-Path $PSScriptRoot 'media_service.py'
$record = Get-Item (Join-Path $root 'runtime/media.pid')
$launcherId = [int](Get-Content -LiteralPath $record.FullName)
$launcher = Get-CimInstance Win32_Process -Filter "ProcessId=$launcherId"
$commandMatches = $process.CommandLine -and $process.CommandLine.Replace('/', '\').Contains($entry)
$launchMatches = $launcher -and $launcher.Name -eq 'python.exe' -and [Math]::Abs(($launcher.CreationDate-$record.LastWriteTime).TotalSeconds) -lt 60 -and ($process.ProcessId -eq $launcherId -or ($process.ParentProcessId -eq $launcherId -and [Math]::Abs(($process.CreationDate-$launcher.CreationDate).TotalSeconds) -lt 60))
if ($process.Name -ne 'python.exe' -or -not ($commandMatches -or $launchMatches)) {throw 'Media process identity cannot be verified; nothing stopped.'}
Stop-Process -Id $process.ProcessId
Wait-Process -Id $process.ProcessId -Timeout 10 -ErrorAction SilentlyContinue
$python = Join-Path $root 'runtime/MaiBot/.venv/Scripts/python.exe'
$started = Start-Process -FilePath $python -ArgumentList @('-X','utf8',('"'+$entry+'"')) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'runtime/media.log') -RedirectStandardError (Join-Path $root 'runtime/media.err.log') -PassThru
$started.Id | Set-Content (Join-Path $root 'runtime/media.pid')
for ($attempt=0; $attempt -lt 30; $attempt++) {
    try {
        $ready = Invoke-RestMethod 'http://127.0.0.1:18005/health' -TimeoutSec 3
        if ($ready.service -eq 'dafeiyu-media' -and $ready.incoming_revision -eq 4 -and $ready.vision -eq 'dsh-native-attachment') {
            $ready | ConvertTo-Json | Set-Content (Join-Path $root 'runtime/native-media-loaded.json') -Encoding UTF8
            Write-Output 'DSH native incoming image route is loaded. WeChat account was not restarted.'
            exit 0
        }
    } catch {}
    Start-Sleep -Seconds 1
}
throw 'Media startup not confirmed. Inspect runtime/media.err.log; do not blindly repeat.'
