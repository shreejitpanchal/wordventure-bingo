#requires -Version 5.1
# Launches Wordventure Bingo as a normal browser tab, with hot reload.
# Double-click-friendly: installs dependencies on first run, then starts the
# Vite dev server and opens it in the default browser.

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

if (-not (Test-Path (Join-Path $RepoRoot 'node_modules'))) {
    Write-Host '============================================' -ForegroundColor Cyan
    Write-Host '  Setting up Wordventure Bingo for the'       -ForegroundColor Cyan
    Write-Host '  first time. This only happens once and'     -ForegroundColor Cyan
    Write-Host '  may take a minute...'                       -ForegroundColor Cyan
    Write-Host '============================================' -ForegroundColor Cyan
    Write-Host ''

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host 'Node.js/npm was not found on this computer.' -ForegroundColor Red
        Write-Host 'Install it from https://nodejs.org, then run this script again.'
        Read-Host 'Press Enter to close'
        exit 1
    }

    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host 'Something went wrong installing the required packages.' -ForegroundColor Red
        Read-Host 'Press Enter to close'
        exit 1
    }
    Write-Host ''
    Write-Host 'Setup complete!' -ForegroundColor Green
    Write-Host ''
} else {
    # node_modules already exists, but package.json may have grown a new
    # dependency since it was last installed (e.g. a git pull) -- npm install
    # is a fast no-op when everything's already satisfied, so it's cheap to
    # re-sync on every launch rather than silently running with a stale tree.
    npm install --no-audit --no-fund --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host 'Warning: could not verify packages are up to date (check your' -ForegroundColor Yellow
        Write-Host 'internet connection). Continuing anyway -- the app may fail to' -ForegroundColor Yellow
        Write-Host 'start if a new dependency is missing.' -ForegroundColor Yellow
        Write-Host ''
    }
}

$Port = if ($env:WORDVENTURE_WEB_PORT) { $env:WORDVENTURE_WEB_PORT } else { '5173' }

# Ctrl+C on a previous run doesn't always kill Vite's Node process cleanly --
# it can be left listening on the port, which then makes the next launch
# fail with a confusing "port in use" error instead of just working. Self-heal:
# if a leftover Node process still owns the port, stop it before we start.
$conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
foreach ($procId in ($conns.OwningProcess | Sort-Object -Unique)) {
    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -match '^node') {
        Write-Host "Stopping a leftover Wordventure Bingo server on port $Port (PID $procId)..." -ForegroundColor Yellow
        Stop-Process -Id $procId -Force
    } elseif ($p) {
        Write-Host "Warning: port $Port is already in use by PID $procId ($($p.ProcessName)), which isn't Node -- leaving it alone." -ForegroundColor Yellow
        Write-Host "Set `$env:WORDVENTURE_WEB_PORT to a free port and try again." -ForegroundColor Yellow
    }
}

Write-Host '============================================' -ForegroundColor Cyan
Write-Host "  Wordventure Bingo starting on port $Port"    -ForegroundColor Cyan
Write-Host '  Opens automatically in your browser.'         -ForegroundColor Cyan
Write-Host '  Press Ctrl+C to stop.'                         -ForegroundColor Cyan
Write-Host '============================================' -ForegroundColor Cyan
Write-Host ''

npx vite --port $Port --open
