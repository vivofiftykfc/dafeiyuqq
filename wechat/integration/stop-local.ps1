$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$all = @(Get-CimInstance Win32_Process)
$ids = [System.Collections.Generic.List[int]]::new()
foreach ($name in @('mai','group-mai','embedding','chat-ui','owner-ops','media')) {
    $file = Join-Path $root ('runtime\'+$name+'.pid')
    if (-not (Test-Path -LiteralPath $file)) {continue}
    $saved = [int](Get-Content -LiteralPath $file)
    $proc = $all | Where-Object {$_.ProcessId -eq $saved}
    if ($proc -and $proc.Name -eq 'python.exe' -and $proc.CommandLine.Contains($root) -and ($proc.CommandLine -match 'src.cli.tool|embedding_server.py|chat_server.py|owner_ops.py|media_service.py')) {$ids.Add($saved)}
}
for ($i=0; $i -lt $ids.Count; $i++) {
    foreach ($proc in $all) {if ($proc.ParentProcessId -eq $ids[$i] -and -not $ids.Contains([int]$proc.ProcessId)) {$ids.Add([int]$proc.ProcessId)}}
}
for ($i=$ids.Count-1; $i -ge 0; $i--) {Stop-Process -Id $ids[$i] -ErrorAction SilentlyContinue}
Write-Output 'Stopped project-owned services only.'
