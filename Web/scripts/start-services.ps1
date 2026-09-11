param(
  [int]$FrontendPort = 5173,
  [int]$OcrPort = 8000,
  [int]$SlmPort = 8001
)

$ScriptsDir = $PSScriptRoot
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")

function Test-Port {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" } | Select-Object -First 1
  return $null -ne $conn
}

function Launch-Batch {
  param(
    [string]$Name,
    [string]$BatFile,
    [string]$WorkingDir,
    [string]$LogFile,
    [string]$ErrFile
  )

  $cmd = "cmd.exe /c `"`"$BatFile`" > `"$LogFile`" 2> `"$ErrFile`"`""
  Write-Host "Starting $Name..."
  $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = $cmd
    CurrentDirectory = $WorkingDir
  }
  if ($res.ReturnValue -eq 0) {
    Write-Host "Started $Name (PID $($res.ProcessId))"
  } else {
    Write-Error "Failed to start $Name"
  }
}

# 1. OCR API (Port 8000)
if (Test-Port $OcrPort) {
  Write-Host "OCR API already running on port $OcrPort"
} else {
  Launch-Batch -Name "OCR API" `
    -BatFile (Join-Path $ScriptsDir "run-ocr.bat") `
    -WorkingDir (Join-Path $RootDir "backend") `
    -LogFile (Join-Path $RootDir "backend-ocr.log") `
    -ErrFile (Join-Path $RootDir "backend-ocr.err.log")
}

# 2. SLM API (Port 8001)
if (Test-Port $SlmPort) {
  Write-Host "SLM API already running on port $SlmPort"
} else {
  Launch-Batch -Name "SLM API" `
    -BatFile (Join-Path $ScriptsDir "run-slm.bat") `
    -WorkingDir (Join-Path $RootDir "backend") `
    -LogFile (Join-Path $RootDir "backend-slm.log") `
    -ErrFile (Join-Path $RootDir "backend-slm.err.log")
}

# 3. Frontend (Port 5173)
if (Test-Port $FrontendPort) {
  Write-Host "Frontend already running on port $FrontendPort"
} else {
  Launch-Batch -Name "Frontend (Vite)" `
    -BatFile (Join-Path $ScriptsDir "run-frontend.bat") `
    -WorkingDir $RootDir `
    -LogFile (Join-Path $RootDir "frontend-vite.log") `
    -ErrFile (Join-Path $RootDir "frontend-vite.err.log")
}

# Wait for services to respond
function Wait-Endpoint {
  param([string]$Name, [string]$Url, [int]$Timeout = 30)
  $deadline = (Get-Date).AddSeconds($Timeout)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
        Write-Host "$Name is ready: $Url (Status $($resp.StatusCode))"
        return $true
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  Write-Warning "$Name did not respond in $Timeout s: $Url"
  return $false
}

Write-Host "`nVerifying services..."
Wait-Endpoint -Name "OCR API" -Url "http://127.0.0.1:$OcrPort/api/health" -Timeout 20
Wait-Endpoint -Name "SLM API" -Url "http://127.0.0.1:$SlmPort/api/slm/health" -Timeout 20
Wait-Endpoint -Name "Frontend" -Url "http://127.0.0.1:$FrontendPort" -Timeout 20

Write-Host "`n================================================"
Write-Host "  Web project is ready!"
Write-Host "  Frontend URL: http://127.0.0.1:$FrontendPort"
Write-Host "  OCR API:      http://127.0.0.1:$OcrPort"
Write-Host "  SLM API:      http://127.0.0.1:$SlmPort"
Write-Host "================================================"
