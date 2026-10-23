$ErrorActionPreference='Stop'
$wechatRoot=(Join-Path (Split-Path $PSScriptRoot -Parent) 'wechat')
Set-Location -LiteralPath $wechatRoot
do {
 & (Join-Path $wechatRoot 'runtime\wechat-env\Scripts\python.exe') -X utf8 (Join-Path $wechatRoot 'integration\wechat_bridge.py')
 $code=$LASTEXITCODE
} while($code -eq 75 -and -not(Test-Path (Join-Path $wechatRoot 'runtime\wechat-bridge.stop')))
exit $code
