param(
  [int[]]$Ports = @(5173, 8000, 8001)
)

Write-Host "Stopping LogiAI services on ports: $($Ports -join ', ')..."

foreach ($port in $Ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
  if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pids) {
      if ($p -and $p -gt 0) {
        Write-Host "Terminating process on port $port (PID $p)..."
        cmd.exe /c "taskkill /F /T /PID $p" | Out-Null
      }
    }
  } else {
    Write-Host "Port $port is not in use."
  }
}

Write-Host "All specified services have been stopped."
