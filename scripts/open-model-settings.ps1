param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
try {
    $root = Split-Path $PSScriptRoot -Parent
    $log = Join-Path $root 'logs\dsh.out.log'
    if (-not (Test-Path -LiteralPath $log)) {
        throw 'DSH startup log is missing. Start DSH first.'
    }
    $found = @(Select-String -LiteralPath $log -Pattern 'http://127\.0\.0\.1:18031/\?token=[^\s\x1b]+')
    if ($found.Count -eq 0) {
        throw 'DSH login URL was not found. Start DSH first.'
    }
    $url = $found[-1].Matches[0].Value
    $uri = [Uri]$url
    if ($uri.Host -ne '127.0.0.1' -or $uri.Port -ne 18031 -or $uri.Scheme -ne 'http') {
        throw 'Unexpected DSH login address.'
    }
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $pending = $client.ConnectAsync('127.0.0.1', 18031)
        if (-not $pending.Wait(3000)) { throw 'DSH is not responding on port 18031.' }
    } finally {
        $client.Dispose()
    }
    if ($CheckOnly) {
        Write-Host 'OK: script parsed, local DSH login URL found.'
    } else {
        Start-Process -FilePath $url
    }
    exit 0
} catch {
    # Never print the login URL or its token.
    Write-Host ('Failed: ' + $_.Exception.Message)
    exit 1
}
