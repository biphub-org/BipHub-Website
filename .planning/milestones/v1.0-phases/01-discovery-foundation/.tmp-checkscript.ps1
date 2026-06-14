[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$f = 'C:\dev\Antigravity\BIP_project\.planning\phases\01-discovery-foundation\.tmp-revision2.ps1'
$bytes = [System.IO.File]::ReadAllBytes($f)
# Look for the byte sequence that should be the >= char (E2 89 A5)
for ($i = 0; $i -lt $bytes.Length - 2; $i++) {
    if ($bytes[$i] -eq 0xE2 -and $bytes[$i+1] -eq 0x89 -and $bytes[$i+2] -eq 0xA5) {
        Write-Host "Found ≥ (E2 89 A5) at byte offset $i"
    }
    if ($bytes[$i] -eq 0xE2 -and $bytes[$i+1] -eq 0x80 -and $bytes[$i+2] -eq 0x94) {
        Write-Host "Found em-dash (E2 80 94) at byte offset $i"
    }
}
# Check for BOM
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Write-Host "BOM present"
} else {
    Write-Host "No BOM (first 3 bytes: $('{0:X2}' -f $bytes[0]) $('{0:X2}' -f $bytes[1]) $('{0:X2}' -f $bytes[2]))"
}
