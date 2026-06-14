[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$f = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\01-02-PLAN.md'
$c = Get-Content -Raw -Encoding UTF8 -Path $f
$idx = $c.IndexOf('ERASMUS_COUNTRIES` of length')
$slice = $c.Substring($idx, 80)
$bytes = [System.Text.Encoding]::UTF8.GetBytes($slice)
$hex = ($bytes | ForEach-Object { '{0:X2}' -f $_ }) -join ' '
Write-Host "slice: [$slice]"
Write-Host "bytes: $hex"
