$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$cli='__DSH_ROOT__/resources/runtime/cli/bin/dsh.cmd'
$patch=Get-Content (Join-Path $root 'local/dsh-private.patch.yml') -Raw -Encoding UTF8 | ConvertFrom-Json
$soul=($patch | Where-Object id -eq 'soul-md').config
$soul.cards=@{'上游鲸鱼娘-语气试验'=(Get-Content (Join-Path $root 'runtime/research/dsh-whale-persona/人设原文.md') -Raw -Encoding UTF8)}
$soul.active='上游鲸鱼娘-语气试验'
$overlay=Join-Path $root 'runtime/dsh-whale-evaluation.patch.yml'
$patch | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $overlay -Encoding UTF8
$session=$null
$turns=@()
Push-Location (Join-Path $root 'runtime/dsh-workspace')
try {
 foreach($text in @('我还有半小时就下班了，爽爽爽','少问一点啦，坐着陪我等就行','对了，熵增是不是就说明我的房间一定越来越乱呀')) {
  $started=Get-Date
  $arguments=@('--profile','dafeiyu','--patch',$overlay,'--json')
  if($session){$arguments+=@('--session-id',$session)}
  $arguments+='-'
  $output=@($text | & $cli @arguments 2> (Join-Path $root 'runtime/dsh-whale-evaluation.stderr'))
  if($LASTEXITCODE -ne 0){throw 'DSH evaluation failed; never sends or falls back to WeChat'}
  $events=@($output | Where-Object {$_.StartsWith('{')} | ForEach-Object {$_ | ConvertFrom-Json})
  $session=($events | Where-Object type -eq 'session' | Select-Object -First 1).sessionId
  $reply=($events | Where-Object type -eq 'final' | Select-Object -Last 1).text
  if(!$reply){throw 'DSH returned no final answer'}
  $turns+=@{user=$text;reply=$reply;session=$session;tools=@($events | Where-Object type -eq 'tool_call' | Select-Object -ExpandProperty tool);seconds=[Math]::Round(((Get-Date)-$started).TotalSeconds,2)}
 }
 $report=@{engine='DSH deepseek-account/deepseek-flash';wechat_sent=$false;production_role_changed=$false;turns=$turns}
 $report | ConvertTo-Json -Depth 20 | Set-Content (Join-Path $root 'runtime/dsh-whale-evaluation.json') -Encoding UTF8
 $report | ConvertTo-Json -Depth 20
} finally {Pop-Location}
