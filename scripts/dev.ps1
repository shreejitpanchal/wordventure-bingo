#requires -Version 5.1
# Dev tasks. Behaviourally identical to dev.sh -- same task names, same gating,
# same footer format.
[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Tasks)

$ErrorActionPreference = 'Continue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir
$LogDir    = Join-Path $ScriptDir 'logs'
$Dist      = Join-Path $RepoRoot 'dist'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $RepoRoot
$env:NO_COLOR = '1'

# --- output helpers ---------------------------------------------------------
function Step { param($m) Write-Host "==> $m" -ForegroundColor Cyan }
function Ok   { param($m) Write-Host "ok: $m"    -ForegroundColor Green }
function Warn { param($m) Write-Host "warn: $m"  -ForegroundColor Yellow }
function Die  { param($m) Write-Host "error: $m" -ForegroundColor Red; exit 1 }

function Get-Now { (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz') }
function Get-Log { param($Task) Join-Path $LogDir "$Task.log" }

function Start-TaskLog {
  param($Task)
  Set-Content -Path (Get-Log $Task) -Encoding utf8 `
    -Value ("=== {0} | {1} ===" -f (Get-Now), $Task)
}

function Write-Finish {
  param([string]$Task, [int]$Code, [int]$Seconds)
  $status = if ($Code -eq 0) { 'OK' } else { "FAILED (exit $Code)" }
  $line = '{0} | {1} | {2}s | {3}' -f (Get-Now), $Task, $Seconds, $status
  # Add-Content, never Tee-Object: Tee doubles lines and writes UTF-16.
  Add-Content -Path (Get-Log $Task) -Value $line -Encoding utf8
  Write-Host $line
}

# Capture once, write once. "$_" flattens stderr ErrorRecords; -Width stops
# column wrap; the CSI strip keeps the file readable plain text.
function Invoke-Logged {
  # NB: $CmdArgs, not $Args -- $Args is a PowerShell automatic variable, so a
  # param named $Args binds empty and `& $Exe @Args` runs $Exe with no args.
  param([string]$Task, [string]$Exe, [string[]]$CmdArgs)
  $out = (& $Exe @CmdArgs 2>&1 | ForEach-Object { "$_" } | Out-String -Width 4096)
  $code = $LASTEXITCODE
  $out = $out -replace "\x1b\[[0-9;?]*[a-zA-Z]", ""
  Add-Content -Path (Get-Log $Task) -Value $out -Encoding utf8
  Write-Host $out
  return $code
}

# --- target resolution ------------------------------------------------------
function Get-HostArch {
  switch ($env:PROCESSOR_ARCHITECTURE) {
    'AMD64' { 'amd64' } 'ARM64' { 'arm64' } default { 'amd64' }
  }
}
$TOs   = if ($env:TARGET_OS)   { $env:TARGET_OS }   else { 'windows' }
$TArch = if ($env:TARGET_ARCH) { $env:TARGET_ARCH } else { Get-HostArch }
$BinName = "{0}-{1}-{2}" -f (Split-Path -Leaf $RepoRoot), $TOs, $TArch
if ($TOs -eq 'windows') { $BinName = "$BinName.exe" }

# --- tasks ------------------------------------------------------------------
# PowerShell returns EVERY uncaptured pipeline value, not just `return`: a bare
# external command inside a task turns $code into an array. Route commands
# through Invoke-Logged, or pipe anything you don't return to Out-Null.

# The web build is always the same (Vite -> dist/). This script only ever
# runs on Windows, so $TOs defaults to 'windows' even for the ordinary CI
# gate build -- that is NOT the release packaging path. Windows packaging is
# only exercised by tag.yml's `binaries` job, which runs dev.sh (not this
# script) with an explicit TARGET_OS=windows on an ubuntu-24.04 runner.
function Task-build {
  New-Item -ItemType Directory -Force -Path $Dist | Out-Null
  $c = Invoke-Logged 'build' 'npm' @('ci'); if ($c -ne 0) { return $c }
  return (Invoke-Logged 'build' 'npm' @('run', 'build'))
}

function Task-vet {
  $c = Invoke-Logged 'vet' 'npx' @('eslint', '.'); if ($c -ne 0) { return $c }
  return (Invoke-Logged 'vet' 'npx' @('tsc', '--noEmit'))
}

function Task-test {
  return (Invoke-Logged 'test' 'npx' @('vitest', 'run'))
}

function Task-cov {
  # vitest prints the coverage summary (including the total) to stdout, which
  # Invoke-Logged captures into logs/cov.log -- that satisfies "print the total".
  return (Invoke-Logged 'cov' 'npx' @('vitest', 'run', '--coverage'))
}

# The actual build, logged under the calling task so a standalone `scan` never
# appends to a stale image.log. Unreachable here: this project ships no
# container image (no Dockerfile). Left generic in case that ever changes.
function Build-Image {
  param([string]$Task)
  $tag = "{0}:dev" -f (Split-Path -Leaf $RepoRoot)
  return (Invoke-Logged $Task 'docker' @('build','--progress=plain','-t',$tag,'.'))
}

function Task-image {
  if (-not (Test-Path (Join-Path $RepoRoot 'Dockerfile'))) {
    Warn 'no Dockerfile; skipping image'; return 0
  }
  return (Build-Image 'image')
}

# One task, every applicable check. FATAL on fixable CVEs.
function Task-scan {
  $c = Invoke-Logged 'scan' 'npm' @('audit', '--audit-level=high')
  if ($c -ne 0) { return $c }

  if (Test-Path (Join-Path $RepoRoot 'Dockerfile')) {
    $c = Build-Image 'scan'; if ($c -ne 0) { return $c }
    $tag = "{0}:dev" -f (Split-Path -Leaf $RepoRoot)
    return (Invoke-Logged 'scan' 'docker' @(
      'run','--rm','--pull=always','-e','NO_COLOR=1','aquasec/trivy:latest','image',
      '--quiet','--exit-code','1','--severity','HIGH,CRITICAL',
      '--ignore-unfixed',$tag))
  }
  return 0
}

# No compose stack in this project (no backend) -- warn-and-skip rather than
# hard-fail if these are invoked; neither is in `all`/`full`.
function Task-up {
  if (-not (Test-Path (Join-Path $RepoRoot 'docker-compose.yml')) -and
      -not (Test-Path (Join-Path $RepoRoot 'compose.yaml'))) {
    Warn 'no compose file; skipping up'; return 0
  }
  return (Invoke-Logged 'up' 'docker' @('compose','up','-d'))
}
function Task-down {
  if (-not (Test-Path (Join-Path $RepoRoot 'docker-compose.yml')) -and
      -not (Test-Path (Join-Path $RepoRoot 'compose.yaml'))) {
    Warn 'no compose file; skipping down'; return 0
  }
  return (Invoke-Logged 'down' 'docker' @('compose','down'))
}

# Interactive local-only task: serves the production build for manual
# checking. Not part of `all`/`full` -- there's nothing to assert here.
function Task-preview {
  return (Invoke-Logged 'preview' 'npm' @('run', 'preview'))
}

function Task-graphify {
  if ($env:CI) { Warn 'graphify is local-only; skipping in CI'; return 0 }
  if (Get-Command graphify -ErrorAction SilentlyContinue) {
    return (Invoke-Logged 'graphify' 'graphify' @('update','.'))
  }
  try {
    & python -m graphify --help *> $null
    if ($LASTEXITCODE -eq 0) {
      return (Invoke-Logged 'graphify' 'python' @('-m', 'graphify', 'update', '.'))
    }
  } catch {}
  Warn 'graphify not available; skipping'; return 0
}

# --- dispatch ---------------------------------------------------------------
$All  = @('build','vet','test')
$Full = @('build','vet','test','cov','image','scan','graphify')

function Show-Usage {
  @"
usage: dev.ps1 <task>...

  build vet test cov scan image up down graphify preview
  all   = $($All -join ' ')            (what CI runs, as: all scan)
  full  = $($Full -join ' ')           (pre-tag sweep)
"@ | Write-Host
}

if (-not $Tasks -or $Tasks[0] -in @('-h','--help','help')) { Show-Usage; exit 0 }

$queue = @()
foreach ($t in $Tasks) {
  switch ($t) { 'all' { $queue += $All } 'full' { $queue += $Full } default { $queue += $t } }
}

$failed = 0
foreach ($task in $queue) {
  if (-not (Get-Command "Task-$task" -ErrorAction SilentlyContinue)) { Die "unknown task: $task" }
  Step $task
  Start-TaskLog $task
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $code = 0
  try { $code = & "Task-$task" } catch { $code = 1 }
  if ($null -eq $code) { $code = 0 }
  $sw.Stop()
  Write-Finish -Task $task -Code $code -Seconds ([int]$sw.Elapsed.TotalSeconds)
  if ($code -ne 0) { $failed = 1; Warn "$task failed; stopping"; break }
  Ok $task
}
exit $failed
