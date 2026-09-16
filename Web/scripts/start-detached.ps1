param(
  [string]$HostAddress = "0.0.0.0",
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
  $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" } | Select-Object -First 1
  return $null -ne $conn
}

function Start-DetachedProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command,
    [string]$LogFile,
    [string]$ErrorLogFile
  )

  $cmdLine = "cmd.exe /c cd /d `"$WorkingDirectory`" && $Command > `"$LogFile`" 2> `"$ErrorLogFile`""
  Write-Host "Starting $Name..."
  $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = $cmdLine
    CurrentDirectory = $WorkingDirectory
  }
  if ($res.ReturnValue -eq 0) {
    Write-Host "Successfully launched $Name (PID $($res.ProcessId))"
  } else {
    Write-Error ("Failed to launch " + $Name + " return code " + $res.ReturnValue)
  }
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
  throw "Backend virtualenv not found: $Python"
}

Write-Host "LogiAI starting detached services..."

# 1. Frontend
if (Test-Port $FrontendPort) {
  Write-Host "Frontend already listening on $FrontendPort"
} else {
  Start-DetachedProcess `
    -Name "Frontend (Vite)" `
    -WorkingDirectory $Root `
    -Command "npm run dev" `
    -LogFile (Join-Path $Root "frontend-vite.log") `
    -ErrorLogFile (Join-Path $Root "frontend-vite.err.log")
}

# 2. OCR API
if (Test-Port $OcrPort) {
  Write-Host "OCR API already listening on $OcrPort"
} else {
  Start-DetachedProcess `
    -Name "OCR API" `
    -WorkingDirectory $Backend `
    -Command "`"$Python`" -m uvicorn ocr_app:app --host $HostAddress --port $OcrPort" `
    -LogFile (Join-Path $Root "backend-ocr.log") `
    -ErrorLogFile (Join-Path $Root "backend-ocr.err.log")
}

# 3. SLM API
if (Test-Port $SlmPort) {
  Write-Host "SLM API already listening on $SlmPort"
} else {
  Start-DetachedProcess `
    -Name "SLM API" `
    -WorkingDirectory $Backend `
    -Command "`"$Python`" -m uvicorn slm_app:app --host $HostAddress --port $SlmPort" `
    -LogFile (Join-Path $Root "backend-slm.log") `
    -ErrorLogFile (Join-Path $Root "backend-slm.err.log")
}

Wait-Http -Name "Frontend" -Url "http://127.0.0.1:$FrontendPort"
Wait-Http -Name "OCR API" -Url "http://127.0.0.1:$OcrPort/api/health"
Wait-Http -Name "SLM API" -Url "http://127.0.0.1:$SlmPort/api/slm/health"

Write-Host ""
Write-Host "=== All Services Successfully Running in Background ==="
Write-Host "Frontend: http://127.0.0.1:$FrontendPort"
Write-Host "OCR API:  http://127.0.0.1:$OcrPort"
Write-Host "SLM API:  http://127.0.0.1:$SlmPort"
