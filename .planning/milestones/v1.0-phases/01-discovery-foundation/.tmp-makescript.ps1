[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Build the actual revision script content with explicit char codes (no embedded unicode in script).
$bt = '`'  # backtick (in single quotes is literal)
# Actually we can't use bare backtick in single-quoted string in PowerShell? Yes single quotes are literal.

$scriptLines = @(
    '$ErrorActionPreference = ''Stop''',
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '$f02 = ''C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\01-02-PLAN.md''',
    '',
    '# Build chars from codepoints to avoid script-encoding issues',
    '$bt = [string][char]0x60   # backtick',
    '$em = [string][char]0x2014 # em-dash',
    '$ge = [string][char]0x2265 # >=',
    '',
    '$content = Get-Content -Raw -Encoding UTF8 -Path $f02',
    '$btE = [regex]::Escape($bt)',
    '',
    '# Pattern matches the ERASMUS_COUNTRIES line + the trailing 3 lines (npm run build, npm run lint, </acceptance_criteria>)',
    '$pattern = ''(\s+- '' + $btE + ''lib/countries\.ts'' + $btE + '' exists, exports '' + $btE + ''ERASMUS_COUNTRIES'' + $btE + '' of length '' + $ge + ''30[^\r\n]*)(\r?\n\s+- '' + $btE + ''npm run build'' + $btE + '' exits 0\r?\n\s+- '' + $btE + ''npm run lint'' + $btE + '' exits 0\r?\n\s+</acceptance_criteria>)''',
    '',
    '$matches = [regex]::Matches($content, $pattern)',
    'Write-Host "Matches: $($matches.Count)"',
    '',
    'if ($matches.Count -eq 1) {',
    '    $flagSmoke = "    - " + $bt + "lib/countries.ts" + $bt + " exports " + $bt + "getCountryFlagEmoji(code: string): string" + $bt + " (consumed by Plan 01-07). Smoke test: " + $bt + ''node -e "console.log(require('' + "''" + ''./lib/countries'' + "''" + '').getCountryFlagEmoji('' + "''" + ''de'' + "''" + ''))"'' + $bt + '' prints the German flag emoji.''',
    '    $iso2Lock = "    - **iso2 prohibition (B2 contract lock):** " + $bt + ''grep -nE "\biso2\b" lib/countries.ts'' + $bt + " returns 0 matches. The canonical property name is " + $bt + "code" + $bt + ", locked in the " + $bt + "<interfaces>" + $bt + " block. Downstream plans 01-05, 01-06, 01-07 must use " + $bt + "c.code" + $bt + " and will fail to compile if they reference " + $bt + "c.iso2" + $bt + "."',
    '    $replacement = ''$1'' + [Environment]::NewLine + $flagSmoke + [Environment]::NewLine + $iso2Lock + ''$2''',
    '    # Use \n since file uses LF only',
    '    $replacement = ''$1'' + "`n" + $flagSmoke + "`n" + $iso2Lock + ''$2''',
    '    $newContent = [regex]::Replace($content, $pattern, $replacement)',
    '    [System.IO.File]::WriteAllText($f02, $newContent, (New-Object System.Text.UTF8Encoding $false))',
    '    Write-Host "OK"',
    '} else {',
    '    Write-Host "No unique match"',
    '}'
)

$out = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\.tmp-w4-inject.ps1'
# Write with UTF-8 BOM so PowerShell reads it correctly
$utf8WithBom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllLines($out, $scriptLines, $utf8WithBom)
Write-Host "Wrote $out with BOM"
