$f = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\01-06-PLAN.md'
$c = Get-Content -Raw -Encoding UTF8 -Path $f

# Search for the line we want to match
$searchExact = '- `import { ERASMUS_COUNTRIES, getCountryName } from ''@/lib/countries''` — 33-country list with iso2 + name'
Write-Host "Looking for em-dash variant..."
Write-Host "  Contains: $($c.Contains($searchExact))"

# Now find the actual byte sequence around iso2
$idx = $c.IndexOf('iso2 + name')
if ($idx -ge 0) {
    $before = $c.Substring([Math]::Max(0, $idx - 80), [Math]::Min(80, $idx))
    Write-Host "  Context before: [$before]"
    # Get hex of the dash
    $dashIdx = $before.LastIndexOf("`u{2014}")
    if ($dashIdx -ge 0) { Write-Host "  Em-dash (U+2014) found at offset $dashIdx" }
    $hyphenIdx = $before.LastIndexOf('-')
    Write-Host "  Last regular hyphen at offset $hyphenIdx"
}
