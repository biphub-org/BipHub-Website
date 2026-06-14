[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$f = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\01-06-PLAN.md'
$c = Get-Content -Raw -Encoding UTF8 -Path $f

# Find the full line containing "iso2 + name"
$lineStart = $c.LastIndexOf("`n", $c.IndexOf('iso2 + name')) + 1
$lineEnd = $c.IndexOf("`n", $c.IndexOf('iso2 + name'))
$line = $c.Substring($lineStart, $lineEnd - $lineStart)
Write-Host "Full line: [$line]"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($line)
$hex = ($bytes | ForEach-Object { '{0:X2}' -f $_ }) -join ' '
Write-Host "Bytes: $hex"
