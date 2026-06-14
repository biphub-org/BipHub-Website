$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dir = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation'
$em = [string][char]0x2014  # em dash —
$ge = [string][char]0x2265  # ≥
$nl = [Environment]::NewLine
# Files use LF based on the read showing line numbers; the file is git-managed.
# But Get-Content -Raw reads native line endings; let's check first.

function Get-LineEnding {
    param([string]$Path)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    for ($i = 0; $i -lt [Math]::Min($bytes.Length, 4000); $i++) {
        if ($bytes[$i] -eq 0x0A) {
            if ($i -gt 0 -and $bytes[$i-1] -eq 0x0D) { return "`r`n" } else { return "`n" }
        }
    }
    return "`n"
}

function Replace-In-File {
    param([string]$Path, [string]$Old, [string]$New, [string]$Tag)
    $content = Get-Content -Raw -Encoding UTF8 -Path $Path
    if ($null -eq $content) { throw "Empty file: $Path" }
    if (-not $content.Contains($Old)) {
        Write-Host "[$Tag] OLD-NOT-FOUND in $Path"
        return $false
    }
    $matches = [regex]::Matches($content, [regex]::Escape($Old)).Count
    if ($matches -gt 1) {
        Write-Host "[$Tag] AMBIGUOUS ($matches matches) in $Path"
        return $false
    }
    $newContent = $content.Replace($Old, $New)
    [System.IO.File]::WriteAllText($Path, $newContent, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "[$Tag] OK in $Path"
    return $true
}

# Inline code uses backtick `; build via ASCII char to be safe
$bt = [string][char]0x60  # `
$bt3 = $bt + $bt + $bt    # ```

$f06 = Join-Path $dir '01-06-PLAN.md'
$f02 = Join-Path $dir '01-02-PLAN.md'

$le06 = Get-LineEnding $f06
$le02 = Get-LineEnding $f02
Write-Host "01-06 line ending: $($le06.Length) chars"
Write-Host "01-02 line ending: $($le02.Length) chars"

# ============================================================
# B2 — 01-06: Update interfaces description (iso2 -> code)
# ============================================================

$b2_iface_old = '- ' + $bt + 'import { ERASMUS_COUNTRIES, getCountryName } from ' + "'@/lib/countries'" + $bt + ' ' + $em + ' 33-country list with iso2 + name'
$b2_iface_new = '- ' + $bt + 'import { ERASMUS_COUNTRIES, getCountryName } from ' + "'@/lib/countries'" + $bt + ' ' + $em + ' 33-country list with property name ' + $bt + 'code' + $bt + ' (ISO 3166-1 alpha-2, lowercase) and ' + $bt + 'name' + $bt + '. CANONICAL KEY IS ' + $bt + 'code' + $bt + ', NOT ' + $bt + 'iso2' + $bt + '. See 01-02 interfaces block.'
Replace-In-File -Path $f06 -Old $b2_iface_old -New $b2_iface_new -Tag 'B2-01-06-interfaces'

# ============================================================
# B2 — 01-02: Lock the ERASMUS_COUNTRIES contract in <interfaces> block
# ============================================================

$b2_02_iface_old = $bt + 'lib/countries.ts' + $bt + ' exports the 33 Erasmus+ programme countries with ISO 3166-1 alpha-2 codes ' + $em + ' see ' + $bt + '.planning/research/STACK.md' + $bt + ' line 109 referencing the eligible countries source.'

# Build the new contract block line-by-line
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add($b2_02_iface_old)
$lines.Add('')
$lines.Add('**CANONICAL CONTRACT (locked ' + $em + ' downstream plans 01-05, 01-06, 01-07 import this exact shape):**')
$lines.Add('')
$lines.Add($bt3 + 'typescript')
$lines.Add('// The property is ' + $bt + 'code' + $bt + ', NOT ' + $bt + 'iso2' + $bt + '. Do not rename in downstream plans.')
$lines.Add('export const ERASMUS_COUNTRIES: ReadonlyArray<{')
$lines.Add('  code: string  // ISO 3166-1 alpha-2 (uppercase per ISO standard)')
$lines.Add('  name: string')
$lines.Add('}>')
$lines.Add('')
$lines.Add('export const ERASMUS_COUNTRY_CODES: readonly string[]')
$lines.Add('export type ErasmusCountryCode = (typeof ERASMUS_COUNTRY_CODES)[number]')
$lines.Add('')
$lines.Add('export function getCountryName(code: string): string')
$lines.Add('export function isErasmusCountry(code: string): code is ErasmusCountryCode')
$lines.Add('')
$lines.Add('/**')
$lines.Add(' * ISO alpha-2 ' + $em + ' regional indicator emoji pair (renders as a flag in modern OS fonts and Satori).')
$lines.Add(' * Consumed by Plan 01-07 (BipHeader, opengraph-image).')
$lines.Add(' */')
$lines.Add('export function getCountryFlagEmoji(code: string): string')
$lines.Add($bt3)
$b2_02_iface_new = ($lines -join $le02)

Replace-In-File -Path $f02 -Old $b2_02_iface_old -New $b2_02_iface_new -Tag 'B2-01-02-interfaces-contract'

# ============================================================
# W4 — 01-02 Task 3: Update acceptance_criteria block
# ============================================================
$ac_old_lines = @(
    '    - ' + $bt + 'lib/countries.ts' + $bt + ' exists, exports ' + $bt + 'ERASMUS_COUNTRIES' + $bt + ' of length ' + $ge + '30 (allow 30-33 ' + $em + ' exact 33 expected but i18n-iso-countries may not have a name for one of the Western Balkan codes)',
    '    - ' + $bt + 'npm run build' + $bt + ' exits 0',
    '    - ' + $bt + 'npm run lint' + $bt + ' exits 0',
    '  </acceptance_criteria>'
)
$b2_02_ac_old = ($ac_old_lines -join $le02)

$ac_new_lines = @(
    '    - ' + $bt + 'lib/countries.ts' + $bt + ' exists, exports ' + $bt + 'ERASMUS_COUNTRIES' + $bt + ' of length ' + $ge + '30 (allow 30-33 ' + $em + ' exact 33 expected but i18n-iso-countries may not have a name for one of the Western Balkan codes)',
    '    - ' + $bt + 'lib/countries.ts' + $bt + ' exports ' + $bt + 'getCountryFlagEmoji(code: string): string' + $bt + ' (consumed by Plan 01-07). Smoke test: ' + $bt + 'node -e "console.log(require(' + "'" + './lib/countries' + "'" + ').getCountryFlagEmoji(' + "'" + 'de' + "'" + '))"' + $bt + ' prints the German flag emoji.',
    '    - **iso2 prohibition (B2 contract lock):** ' + $bt + 'grep -nE "\biso2\b" lib/countries.ts' + $bt + ' returns 0 matches. The canonical property name is ' + $bt + 'code' + $bt + ', locked in the ' + $bt + '<interfaces>' + $bt + ' block. Downstream plans 01-05, 01-06, 01-07 must use ' + $bt + 'c.code' + $bt + ' and will fail to compile if they reference ' + $bt + 'c.iso2' + $bt + '.',
    '    - ' + $bt + 'npm run build' + $bt + ' exits 0',
    '    - ' + $bt + 'npm run lint' + $bt + ' exits 0',
    '  </acceptance_criteria>'
)
$b2_02_ac_new = ($ac_new_lines -join $le02)

Replace-In-File -Path $f02 -Old $b2_02_ac_old -New $b2_02_ac_new -Tag 'W4-01-02-acceptance'

Write-Host "DONE-B2-pass2"
