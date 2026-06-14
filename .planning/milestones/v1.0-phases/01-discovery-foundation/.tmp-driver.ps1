$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dir = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation'
$patches = Join-Path $dir '.tmp-patches'

function Patch {
    param([string]$Tag, [string]$TargetFile, [string]$OldName, [string]$NewName)
    $target = Join-Path $dir $TargetFile
    $oldF = Join-Path $patches "$OldName.old.txt"
    $newF = Join-Path $patches "$NewName.new.txt"
    if (-not (Test-Path $target)) { Write-Host "[$Tag] TARGET MISSING: $target"; return }
    if (-not (Test-Path $oldF)) { Write-Host "[$Tag] OLD PATCH MISSING: $oldF"; return }
    if (-not (Test-Path $newF)) { Write-Host "[$Tag] NEW PATCH MISSING: $newF"; return }
    $content = Get-Content -Raw -Encoding UTF8 -Path $target
    $oldText = Get-Content -Raw -Encoding UTF8 -Path $oldF
    $newText = Get-Content -Raw -Encoding UTF8 -Path $newF
    # Strip trailing newline from patch files (Get-Content -Raw includes the file's trailing LF)
    $oldText = $oldText.TrimEnd("`r","`n")
    $newText = $newText.TrimEnd("`r","`n")
    if (-not $content.Contains($oldText)) {
        Write-Host "[$Tag] OLD-NOT-FOUND in $TargetFile"
        return
    }
    $count = [regex]::Matches($content, [regex]::Escape($oldText)).Count
    if ($count -gt 1) {
        Write-Host "[$Tag] AMBIGUOUS ($count matches) in $TargetFile"
        return
    }
    $newContent = $content.Replace($oldText, $newText)
    [System.IO.File]::WriteAllText($target, $newContent, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "[$Tag] OK in $TargetFile"
}

# B3 — 01-04
Patch -Tag 'B3-04-frontmatter' -TargetFile '01-04-PLAN.md' -OldName 'B3-04-frontmatter' -NewName 'B3-04-frontmatter'
Patch -Tag 'B3-04-deps'        -TargetFile '01-04-PLAN.md' -OldName 'B3-04-deps'        -NewName 'B3-04-deps'
Patch -Tag 'B3-04-narrative'   -TargetFile '01-04-PLAN.md' -OldName 'B3-04-narrative'   -NewName 'B3-04-narrative'
Patch -Tag 'B3-04-jsx'         -TargetFile '01-04-PLAN.md' -OldName 'B3-04-jsx'         -NewName 'B3-04-jsx'
Patch -Tag 'B3-04-imports'     -TargetFile '01-04-PLAN.md' -OldName 'B3-04-imports'     -NewName 'B3-04-imports'
Patch -Tag 'B3-04-acceptance'  -TargetFile '01-04-PLAN.md' -OldName 'B3-04-acceptance'  -NewName 'B3-04-acceptance'

# W1 — 01-04 truths
Patch -Tag 'W1-04-truths' -TargetFile '01-04-PLAN.md' -OldName 'W1-04-truths' -NewName 'W1-04-truths'

# W3 — 01-06 scope note in Task 3
Patch -Tag 'W3-06-scope' -TargetFile '01-06-PLAN.md' -OldName 'W3-06-scope' -NewName 'W3-06-scope'

# W4 — 01-07 self-heal block + acceptance
Patch -Tag 'W4-07-self-heal'  -TargetFile '01-07-PLAN.md' -OldName 'W4-07-self-heal'  -NewName 'W4-07-self-heal'
Patch -Tag 'W4-07-acceptance' -TargetFile '01-07-PLAN.md' -OldName 'W4-07-acceptance' -NewName 'W4-07-acceptance'

Write-Host "DONE"
