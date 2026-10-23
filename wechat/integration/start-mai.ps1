$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$env:HF_HUB_DISABLE_TELEMETRY = '1'
$python = Join-Path $root 'runtime\MaiBot\.venv\Scripts\python.exe'
$instance = Join-Path $root 'runtime\instance'
$isolation = Join-Path $root 'runtime\isolation.json'
if (Test-Path -LiteralPath $isolation) { $instance = (Get-Content -LiteralPath $isolation -Raw | ConvertFrom-Json).conversations.private.instance }
$proc = Start-Process -FilePath $python -ArgumentList @('-X','utf8','-m','src.cli.tool','run','--directory',('"'+$instance+'"')) -WorkingDirectory (Join-Path $root 'runtime\MaiBot') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'runtime\mai.log') -RedirectStandardError (Join-Path $root 'runtime\mai.err.log') -PassThru
$proc.Id | Set-Content (Join-Path $root 'runtime\mai.pid')
Write-Output ('MaiBot PID: '+$proc.Id)
