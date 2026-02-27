$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$logDir = Join-Path $root 'ops'
if (-not (Test-Path $logDir)) { New-Item -Path $logDir -ItemType Directory | Out-Null }
$logFile = Join-Path $logDir 'scheduler-task.log'

$ts = (Get-Date).ToString('s')
"[$ts] TASK_START" | Out-File -FilePath $logFile -Append -Encoding utf8

try {
  node scripts/sprint2-tick.mjs 2>&1 | Out-File -FilePath $logFile -Append -Encoding utf8
  $ts2 = (Get-Date).ToString('s')
  "[$ts2] SCHEDULER_OK ✅" | Out-File -FilePath $logFile -Append -Encoding utf8
  exit 0
}
catch {
  $ts3 = (Get-Date).ToString('s')
  "[$ts3] TASK_FAIL $($_.Exception.Message)" | Out-File -FilePath $logFile -Append -Encoding utf8
  exit 1
}
