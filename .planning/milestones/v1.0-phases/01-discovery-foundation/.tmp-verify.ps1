[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Check {
    param([string]$File, [string]$Probe, [string]$Tag, [bool]$ExpectPresent = $true)
    $c = Get-Content -Raw -Encoding UTF8 -Path $File
    $present = $c.Contains($Probe)
    $ok = ($present -eq $ExpectPresent)
    $mark = if ($ok) { 'OK' } else { 'FAIL' }
    Write-Host ("[$mark] $Tag (present={0}, expected={1})" -f $present, $ExpectPresent)
}

$f04 = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\01-04-PLAN.md'
$f06 = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\01-06-PLAN.md'
$f02 = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\01-02-PLAN.md'
$f07 = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\01-07-PLAN.md'

Write-Host '=== 01-04 (B3 + W1) ==='
Check $f04 'npx shadcn@latest add sheet' 'B3-deps shadcn install line' $true
Check $f04 'SheetTrigger, SheetContent' 'B3 imports' $true
Check $f04 'components/ui/sheet.tsx' 'B3 frontmatter files_modified' $true
Check $f04 'Mobile nav menu (B3' 'B3 working JSX' $true
Check $f04 'B3 mobile-nav gate' 'B3 acceptance criterion' $true
Check $f04 'placeholder hamburger button that does nothing' 'B3 OLD narrative removed' $false
Check $f04 'At a 959px viewport' 'W1 user-observable 959px truth' $true
Check $f04 'At a 1023px viewport' 'W1 user-observable 1023px truth' $true
Check $f04 'app/globals.css declares the full EU palette + 6 choropleth tier colors + breakpoint overrides + radii + shadows in a single' 'W1 OLD CSS-content truth removed' $false

Write-Host ''
Write-Host '=== 01-06 (B1 + B2 + W3) ==='
Check $f06 'filters.lang.map((l) => l.toUpperCase())' 'B1 OLD toUpperCase removed' $false
Check $f06 'c.iso2' 'B2 OLD iso2 references removed' $false
Check $f06 'B2 country-key gate' 'B2 acceptance criterion' $true
Check $f06 'BROW-04 case-correctness gate' 'B1 acceptance criterion' $true
Check $f06 'Scope note (W3 advisory' 'W3 scope note' $true

Write-Host ''
Write-Host '=== 01-02 (B2 + W4) ==='
Check $f02 'CANONICAL CONTRACT (locked' 'B2 contract lock in interfaces' $true
Check $f02 'export function getCountryFlagEmoji(code: string): string {' 'W4 helper implementation' $true
Check $f02 'iso2 prohibition' 'B2 acceptance criterion' $true
Check $f02 'getCountryFlagEmoji(code: string): string`' 'W4 acceptance criterion (smoke test)' $true

Write-Host ''
Write-Host '=== 01-07 (W4 self-heal) ==='
Check $f07 'A + code.charCodeAt(0) - 65' 'W4 OLD inline impl removed' $false
Check $f07 'is owned by Plan 01-02' 'W4 ownership note in step C' $true
Check $f07 'Confirm ' 'W4 step C heading rename' $true
