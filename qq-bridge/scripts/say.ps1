# 把一句话合成语音并发到主人私聊。
# 用法: powershell -NoProfile -File scripts\say.ps1 -Text "要说的话" [-Voice 'Microsoft Huihui Desktop'] [-Rate 0]
param(
  [Parameter(Mandatory = $true)][string]$Text,
  [string]$Voice = 'Microsoft Huihui Desktop',
  [int]$Rate = 0
)

$root = '__PROJECT_ROOT__'
$audioDir = Join-Path $root 'qq-bridge\audio'
New-Item -ItemType Directory -Force -Path $audioDir | Out-Null

$stamp = Get-Date -Format 'HHmmssfff'
$raw = Join-Path $audioDir "say-$stamp.wav"
$out = Join-Path $audioDir "say-$stamp-16k.wav"

Add-Type -AssemblyName System.Speech
$sp = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $sp.SelectVoice($Voice) } catch { }
$sp.Rate = $Rate
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$sp.SetOutputToWaveFile($raw, $fmt)
$sp.Speak($Text)
$sp.Dispose()

& ffmpeg -y -loglevel error -i $raw -ar 16000 -ac 1 -acodec pcm_s16le $out
if ($LASTEXITCODE -ne 0) { Write-Error 'ffmpeg 转码失败'; exit 1 }

& "$root\snowluma\node.exe" "$root\qq-bridge\scripts\send-voice-once.mjs" ([System.IO.Path]::GetFileName($out))
if ($LASTEXITCODE -ne 0) { Write-Error '发送语音失败'; exit 1 }

Remove-Item $raw -ErrorAction SilentlyContinue
"sent: $out"
