param([string]$Executable='')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
if(-not $Executable){
 $tempRoot=if($env:RUNNER_TEMP){$env:RUNNER_TEMP}else{[IO.Path]::GetTempPath()}
 $tools=Join-Path $tempRoot 'dafeiyu-gitleaks-8.30.1'
 New-Item -ItemType Directory -Force -Path $tools|Out-Null
 & gh release download v8.30.1 --repo gitleaks/gitleaks --pattern '*windows_x64.zip' --pattern '*checksums.txt' --dir $tools --clobber
 if($LASTEXITCODE){throw 'Gitleaks download failed'}
 $zip=Join-Path $tools 'gitleaks_8.30.1_windows_x64.zip'
 $hash=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
 $expected=(Get-Content (Join-Path $tools 'gitleaks_8.30.1_checksums.txt')|Where-Object {$_ -match 'gitleaks_8.30.1_windows_x64.zip$'}).Split(' ')[0]
 if($hash -ne $expected){throw 'Gitleaks download SHA256 mismatch'}
 Expand-Archive -LiteralPath $zip -DestinationPath $tools -Force
 $Executable=Join-Path $tools 'gitleaks.exe'
}
Push-Location $root
try {& $Executable git . --log-opts=--all --redact=100 --no-banner --log-level warn;if($LASTEXITCODE){throw 'Unreviewed secret findings. Do not publish.'}}finally{Pop-Location}
