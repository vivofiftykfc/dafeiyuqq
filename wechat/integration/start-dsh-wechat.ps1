$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$env:DSH_HOME=Join-Path $root 'runtime/dsh-home'
if(Get-NetTCPConnection -LocalPort 18030 -State Listen -ErrorAction SilentlyContinue){throw 'Port 18030 is already occupied; not starting a second host'}
& '__DSH_ROOT__/resources/runtime/cli/bin/dsh.cmd' --profile dafeiyu-wechat --port 18030 --no-open
exit $LASTEXITCODE
