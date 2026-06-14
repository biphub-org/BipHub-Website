[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$c = Get-Content -Raw -Encoding UTF8 -Path 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\01-06-PLAN.md'
$idx = $c.IndexOf('iso2 + name')
Write-Host "iso2 idx: $idx"
$slice = $c.Substring($idx - 5, 5)
$bytes = [System.Text.Encoding]::UTF8.GetBytes($slice)
$hex = ($bytes | ForEach-Object { '{0:X2}' -f $_ }) -join ' '
Write-Host "hex of [.....iso2 + name] last 5 chars before 'iso2': $hex"

# Get the 30 chars before iso2 to see the dash
$slice30 = $c.Substring($idx - 30, 30)
$bytes30 = [System.Text.Encoding]::UTF8.GetBytes($slice30)
$hex30 = ($bytes30 | ForEach-Object { '{0:X2}' -f $_ }) -join ' '
Write-Host "hex of 30 before: $hex30"
Write-Host "text: [$slice30]"

# Try various dashes by codepoint
$dashes = @{
    'hyphen-minus (U+002D)' = [char]0x002D
    'hyphen (U+2010)' = [char]0x2010
    'en-dash (U+2013)' = [char]0x2013
    'em-dash (U+2014)' = [char]0x2014
    'minus (U+2212)' = [char]0x2212
}
foreach ($name in $dashes.Keys) {
    $dash = $dashes[$name]
    $needle = "33${dash}country list with iso2"
    $found = $c.Contains($needle)
    Write-Host "needle with $name -> $found"
}
