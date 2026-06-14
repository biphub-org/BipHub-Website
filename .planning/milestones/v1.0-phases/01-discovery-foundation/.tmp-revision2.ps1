$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dir = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation'

function Replace-Regex {
    param([string]$Path, [string]$Pattern, [string]$Replacement, [string]$Tag)
    $content = Get-Content -Raw -Encoding UTF8 -Path $Path
    $matches = [regex]::Matches($content, $Pattern)
    if ($matches.Count -eq 0) {
        Write-Host "[$Tag] PATTERN-NOT-FOUND in $Path"
        return $false
    }
    if ($matches.Count -gt 1) {
        Write-Host "[$Tag] PATTERN-AMBIGUOUS ($($matches.Count) matches) in $Path"
        return $false
    }
    $newContent = [regex]::Replace($content, $Pattern, $Replacement)
    [System.IO.File]::WriteAllText($Path, $newContent, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "[$Tag] OK in $Path (1 match replaced)"
    return $true
}

$f02 = Join-Path $dir '01-02-PLAN.md'

# Build the regex pattern from char codes to avoid unicode-in-script issues.
# Use \u escapes which the .NET regex engine supports.
# em-dash = —, ≥ = ≥
# Pattern: ( the ERASMUS_COUNTRIES line ) ( newline + spaces + "- `npm run build" ... )
$bt = [string][char]0x60
$btE = [regex]::Escape($bt)

$anchorPattern = '(\s+- ' + $btE + 'lib/countries\.ts' + $btE + ' exists, exports ' + $btE + 'ERASMUS_COUNTRIES' + $btE + ' of length ≥30[^\r\n]*)(\r?\n\s+- ' + $btE + 'npm run build' + $btE + ' exits 0\r?\n\s+- ' + $btE + 'npm run lint' + $btE + ' exits 0\r?\n\s+</acceptance_criteria>)'

$flagSmoke = "    - " + $bt + "lib/countries.ts" + $bt + " exports " + $bt + "getCountryFlagEmoji(code: string): string" + $bt + " (consumed by Plan 01-07). Smoke test: " + $bt + 'node -e "console.log(require(' + "'" + './lib/countries' + "'" + ").getCountryFlagEmoji('de'))" + '"' + $bt + " prints the German flag emoji."

$iso2Lock = "    - **iso2 prohibition (B2 contract lock):** " + $bt + 'grep -nE "\biso2\b" lib/countries.ts' + $bt + " returns 0 matches. The canonical property name is " + $bt + "code" + $bt + ", locked in the " + $bt + "<interfaces>" + $bt + " block. Downstream plans 01-05, 01-06, 01-07 must use " + $bt + "c.code" + $bt + " and will fail to compile if they reference " + $bt + "c.iso2" + $bt + "."

$replacement = '$1' + "`n" + $flagSmoke + "`n" + $iso2Lock + '$2'

Replace-Regex -Path $f02 -Pattern $anchorPattern -Replacement $replacement -Tag 'W4-02-acceptance-injection'

Write-Host "DONE"
