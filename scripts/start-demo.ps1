param(
  [int]$Port = 8545
)

$ErrorActionPreference = 'Stop'

function Set-EnvValue($file, $key, $value) {
  if (-Not (Test-Path $file)) { return }
  $content = Get-Content $file -Raw
  if ($content -match "^$key=.*$" ) {
    $content = $content -replace "^$key=.*$", "$key=$value"
  } else {
    $content = "$content`n$key=$value`n"
  }
  Set-Content -Path $file -Value $content -NoNewline
}

# Resolve project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = Resolve-Path (Join-Path $scriptDir '..')
Write-Host "Project root: $proj"

# Pick an open port for the local node
$primaryPort = $Port
$portBusy = Test-NetConnection -ComputerName 127.0.0.1 -Port $primaryPort -InformationLevel Quiet
if ($portBusy) {
  $Port = 8546
}
Write-Host "Using local Hardhat node port: $Port"

# Update frontend demo RPC URL
$frontendEnv = Join-Path $proj 'frontend/.env'
Set-EnvValue $frontendEnv 'VITE_DEMO_MODE' 'true'
Set-EnvValue $frontendEnv 'VITE_DEMO_RPC_URL' "http://127.0.0.1:$Port"
Write-Host "Updated $frontendEnv for Demo Mode"

# Start local node in a new PowerShell window
Write-Host "Starting local Hardhat node..."
$nodeCmd = "Set-Location `"$proj`"; npx hardhat node --port $Port"
Start-Process powershell -ArgumentList "-NoExit","-Command", $nodeCmd | Out-Null
Start-Sleep -Seconds 4

# Deploy to localhost
Write-Host "Deploying contracts to localhost..."
$deployCmd = "Set-Location `"$proj`"; npx hardhat run --network localhost scripts/deploy.ts"
powershell -NoProfile -Command $deployCmd

# Seed activity (optional but recommended)
Write-Host "Seeding swaps and metrics..."
$simCmd = "Set-Location `"$proj`"; npx hardhat run --network localhost scripts/simulate.ts"
try { powershell -NoProfile -Command $simCmd } catch { Write-Warning $_ }

# Frontend install + build
Write-Host "Installing frontend dependencies..."
$feInstall = "Set-Location `"$proj`"; npm --prefix frontend install"
powershell -NoProfile -Command $feInstall

Write-Host "Building frontend..."
$feBuild = "Set-Location `"$proj`"; npm --prefix frontend run build"
try { powershell -NoProfile -Command $feBuild } catch { Write-Warning $_ }

# Start dev server
Write-Host "Starting frontend dev server... (close window to stop)"
$webCmd = "Set-Location `"$proj`"; npm run web:dev"
Start-Process powershell -ArgumentList "-NoExit","-Command", $webCmd | Out-Null

Write-Host "\nAll set. Open http://localhost:5173 and click LAUNCH PROTOCOL."
