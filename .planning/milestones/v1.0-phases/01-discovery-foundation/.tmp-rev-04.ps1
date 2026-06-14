$ErrorActionPreference = 'Stop'
$path = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\01-04-PLAN.md'
$c = Get-Content -Raw -LiteralPath $path

# Fix duplicated install line in Task 1
$bt = [char]96
$dupInstall = " Also install the shadcn Sheet primitive that Task 2 requires for the mobile navigation menu: ${bt}npx shadcn@latest add sheet${bt}. Verify it landed at ${bt}components/ui/sheet.tsx${bt}. Also install the shadcn Sheet primitive that Task 2 requires for the mobile navigation menu: ${bt}npx shadcn@latest add sheet${bt}. Verify it landed at ${bt}components/ui/sheet.tsx${bt}."
$singleInstall = " Also install the shadcn Sheet primitive that Task 2 requires for the mobile navigation menu: ${bt}npx shadcn@latest add sheet${bt}. Verify it landed at ${bt}components/ui/sheet.tsx${bt}."

if ($c.Contains($dupInstall)) {
  $c = $c.Replace($dupInstall, $singleInstall)
  Write-Host "B3-cleanup: collapsed duplicated install line OK"
} else {
  Write-Host "B3-cleanup: install dup not found"
}

# Detect & dedupe duplicated B3 acceptance lines (lines 637-640).
# Strategy: find the first occurrence of the gate+functional pair, then look for a duplicate immediately after, and if found, remove the duplicate.
$lf = [char]10
$lines = [System.IO.File]::ReadAllLines($path)
$idxsGate = @()
for ($i = 0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match '\*\*B3 mobile-nav gate:\*\*') { $idxsGate += $i }
}
Write-Host "B3 gate lines found at indices: $($idxsGate -join ',')"

if ($idxsGate.Count -ge 2) {
  # Remove the SECOND gate line and the line immediately after it (the functional-check duplicate).
  $secondGate = $idxsGate[1]
  $newLines = New-Object System.Collections.Generic.List[string]
  for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($i -eq $secondGate -or $i -eq ($secondGate + 1)) { continue }
    $newLines.Add($lines[$i])
  }
  [System.IO.File]::WriteAllLines($path, $newLines.ToArray())
  Write-Host "B3-cleanup: removed duplicate acceptance lines at indices $secondGate, $($secondGate+1)"
} else {
  # Just write back the install fix
  Set-Content -LiteralPath $path -Value $c -NoNewline
  Write-Host "B3-cleanup: no duplicate acceptance lines"
}

Write-Host "01-04 size after: $((Get-Item $path).Length) bytes"
