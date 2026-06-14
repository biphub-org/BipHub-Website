$ErrorActionPreference = 'Stop'
$path = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\01-04-PLAN.md'

# Read line 135 raw (1-indexed, so index 134)
$lines = [System.IO.File]::ReadAllLines($path)
$line135 = $lines[134]
Write-Host "Original length: $($line135.Length)"

# Find duplicate phrase
$phrase = "Also install the shadcn Sheet primitive that Task 2 requires for the mobile navigation menu:"
$first = $line135.IndexOf($phrase)
$second = $line135.IndexOf($phrase, $first + $phrase.Length)
Write-Host "First: $first  Second: $second"

if ($second -gt 0) {
  # Find the start of the duplicated chunk (back up to the previous ' Also' boundary)
  # Simpler: chop at the point where the duplicate starts and keep just the first instance.
  $newLine = $line135.Substring(0, $second).TrimEnd()
  # Ensure it ends in punctuation
  if (-not $newLine.EndsWith('.')) { $newLine += '.' }
  $lines[134] = $newLine
  [System.IO.File]::WriteAllLines($path, $lines)
  Write-Host "Cleaned. New line length: $($newLine.Length)"
} else {
  Write-Host "No duplicate found on line 135"
}
