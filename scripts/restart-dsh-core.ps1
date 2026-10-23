$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$exe='__DSH_ROOT__\DeepSeek Harness.exe'
$cli='__DSH_ROOT__\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh-desktop-host\lib\cli.js'
$principal=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Run this specific model-service restart script as administrator.'}
$listeners=@(Get-NetTCPConnection -LocalPort 18031 -State Listen -ErrorAction SilentlyContinue)
foreach($processId in @($listeners.OwningProcess | Select-Object -Unique)){
 $p=Get-CimInstance Win32_Process -Filter "ProcessId=$processId"
 if(-not $p -or $p.ExecutablePath -ine $exe){throw 'Port 18031 belongs to an unexpected process; refusing to stop.'}
 Stop-Process -Id $p.ProcessId -ErrorAction Stop
}
Start-Sleep -Seconds 2
$prior=$env:ELECTRON_RUN_AS_NODE
try{
 $env:ELECTRON_RUN_AS_NODE='1'
 $child=Start-Process -FilePath $exe -ArgumentList ('--expose-internals "{0}" --profile dafeiyuqq --host 127.0.0.1 --port 18031 --no-open' -f $cli) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'logs\dsh-wechat-reload.out.log') -RedirectStandardError (Join-Path $root 'logs\dsh-wechat-reload.err.log') -PassThru
 [IO.File]::WriteAllText((Join-Path $root 'logs\dsh.pid'),[string]$child.Id)
}finally{$env:ELECTRON_RUN_AS_NODE=$prior}
for($i=0;$i -lt 45;$i++){
 if(@(Get-NetTCPConnection -LocalPort 18031 -State Listen -ErrorAction SilentlyContinue).Count){[IO.File]::WriteAllText((Join-Path $root 'logs\dsh-wechat-reload-result.json'),'{"listening":true}');exit 0}
 Start-Sleep -Seconds 1
}
throw 'DSH port did not become ready; inspect dsh-wechat-reload.err.log.'
