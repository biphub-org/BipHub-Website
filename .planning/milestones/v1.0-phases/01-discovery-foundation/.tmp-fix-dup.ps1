$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dir = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation'
$patches = Join-Path $dir '.tmp-patches'

$target = Join-Path $dir '01-04-PLAN.md'
$oldF = Join-Path $patches 'B3-04-fix-dup.old.txt'
$newF = Join-Path $patches 'B3-04-fix-dup.new.txt'

$content = Get-Content -Raw -Encoding UTF8 -Path $target
$oldText = (Get-Content -Raw -Encoding UTF8 -Path $oldF).TrimEnd("`r","`n")
$newText = (Get-Content -Raw -Encoding UTF8 -Path $newF).TrimEnd("`r","`n")

$count = [regex]::Matches($content, [regex]::Escape($oldText)).Count
Write-Host "Match count: $count"
if ($count -ne 1) { exit 1 }

$newContent = $content.Replace($oldText, $newText)
[System.IO.File]::WriteAllText($target, $newContent, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Duplicate Sheet imports removed."

# Verify
$check = Get-Content -Raw -Encoding UTF8 -Path $target
$dupCount = ([regex]::Matches($check, [regex]::Escape("import {`n     Sheet,"))).Count
Write-Host "After fix, Sheet import blocks: $dupCount (expected 1)"
