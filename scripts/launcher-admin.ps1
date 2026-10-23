function Invoke-ElevatedLauncher([string]$Script,[string[]]$Flags=@()){
 $identity=[Security.Principal.WindowsIdentity]::GetCurrent()
 $principal=New-Object Security.Principal.WindowsPrincipal($identity)
 if($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){return}
 Write-Host 'Administrator permission is needed for the native WeChat bridge. Confirm the Windows UAC prompt.'
 $arguments='-NoProfile -ExecutionPolicy Bypass -NoExit -File "'+$Script+'" '+($Flags -join ' ')
 # Interactive launcher window shows startup failures and the console login token.
 $child=Start-Process powershell.exe -Verb RunAs -ArgumentList $arguments -PassThru
 exit 0
}
