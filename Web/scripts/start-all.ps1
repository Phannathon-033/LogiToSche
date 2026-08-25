param(
  [int]$FrontendPort = 5173,
  [int]$OcrPort = 8000,
  [int]$SlmPort = 8001
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Backend = Join-Path $Root "backend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"

function Test-Port {
  param([int]$Port)
  $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" } | Select-Object -First 1
  return $null -ne $connection
}

function Start-BackgroundCommand {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [string]$LogFile,
    [string]$ErrorLogFile
  )

  $arguments = "/c cd /d `"$WorkingDirectory`" && $Command > `"$LogFile`" 2> `"$ErrorLogFile`""
  $processInfo = New-Object System.Diagnostics.ProcessStartInfo
  $processInfo.FileName = "cmd.exe"
  $processInfo.Arguments = $arguments
  $processInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
  $processInfo.UseShellExecute = $true

  $process = [System.Diagnostics.Process]::Start($processInfo)
  Write-Host "started $Name, pid=$($process.Id)"
}

function Wait-Http {
  param(
    [string]$Name,
    [string]$Url,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Write-Host "$Name ready: $Url"
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  Write-Warning "$Name did not respond within $TimeoutSeconds seconds: $Url"
}

if (-not (Test-Path -LiteralPath $Python)) {
  throw "Backend virtualenv not found: $Python. Run backend setup first."
}

Write-Host "LogiAI starting services..."

if (Test-Port $FrontendPort) {
  Write-Host "frontend already running on port $FrontendPort"
} else {
  Start-BackgroundCommand `
    -Name "frontend" `
    -WorkingDirectory $Root `
    -Command "npm run dev" `
    -LogFile (Join-Path $Root "frontend-vite.log") `
    -ErrorLogFile (Join-Path $Root "frontend-vite.err.log")
}

if (Test-Port $OcrPort) {
  Write-Host "OCR API already running on port $OcrPort"
} else {
  Start-BackgroundCommand `
    -Name "OCR API" `
    -WorkingDirectory $Backend `
    -Command "`"$Python`" -m uvicorn ocr_app:app --host 127.0.0.1 --port $OcrPort" `
    -LogFile (Join-Path $Root "backend-ocr.log") `
    -ErrorLogFile (Join-Path $Root "backend-ocr.err.log")
}

if (Test-Port $SlmPort) {
  Write-Host "SLM API already running on port $SlmPort"
} else {
  Start-BackgroundCommand `
    -Name "SLM API" `
    -WorkingDirectory $Backend `
    -Command "`"$Python`" -m uvicorn slm_app:app --host 127.0.0.1 --port $SlmPort" `
    -LogFile (Join-Path $Root "backend-slm.log") `
    -ErrorLogFile (Join-Path $Root "backend-slm.err.log")
}

Wait-Http -Name "frontend" -Url "http://127.0.0.1:$FrontendPort"
Wait-Http -Name "OCR API" -Url "http://127.0.0.1:$OcrPort/api/health"
Wait-Http -Name "SLM API" -Url "http://127.0.0.1:$SlmPort/api/slm/health"

Write-Host ""
Write-Host "Open: http://127.0.0.1:$FrontendPort"
Write-Host "OCR:  http://127.0.0.1:$OcrPort"
Write-Host "SLM:  http://127.0.0.1:$SlmPort"
