#requires -Version 5.1
# Launches Wordventure Bingo in its own chromeless app window (no address
# bar/tabs) instead of a regular browser tab -- closer to how it'll feel
# once installed as a PWA. Double-click-friendly: installs dependencies on
# first run, starts the dev server in the background, waits for it to be
# ready, then opens it in an app window. Closing that window stops the
# server automatically.

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
$AppUrl = "http://localhost:$Port"

$conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
foreach ($procId in ($conns.OwningProcess | Sort-Object -Unique)) {
    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -match '^node') {
        Write-Host "Stopping a leftover Wordventure Bingo server on port $Port (PID $procId)..." -ForegroundColor Yellow
        Stop-Process -Id $procId -Force
    } elseif ($p) {
        Write-Host "Warning: port $Port is already in use by PID $procId ($($p.ProcessName)), which isn't Node -- leaving it alone." -ForegroundColor Yellow
        Write-Host "Set `$env:WORDVENTURE_WEB_PORT to a free port and try again." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host 'Starting Wordventure Bingo...' -ForegroundColor Cyan

# cmd /c so `npx` (a .cmd shim on Windows) launches correctly as a detached
# child; -WindowStyle Hidden keeps its console out of the way.
$serverProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npx', 'vite', '--port', $Port `
    -WindowStyle Hidden -PassThru

try {
    # Poll instead of a fixed sleep -- a fixed delay is either too short
    # (window opens to a connection error) or too long (annoying every launch).
    $deadline = (Get-Date).AddSeconds(30)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $AppUrl -UseBasicParsing -TimeoutSec 1
            if ($r.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
        Start-Sleep -Milliseconds 300
    }
    if (-not $ready) {
        Write-Host 'The app server did not start in time.' -ForegroundColor Red
        Read-Host 'Press Enter to close'
        exit 1
    }

    # A dedicated profile dir keeps this "app window" Edge/Chrome instance
    # separate from the user's normal browsing profile and its open tabs.
    $UserDataDir = Join-Path $env:TEMP 'wordventure-bingo-app-window'

    $browserExe = (Get-Command msedge -ErrorAction SilentlyContinue).Source
    if (-not $browserExe) {
        foreach ($candidate in @(
            "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
            "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
        )) {
            if (Test-Path $candidate) { $browserExe = $candidate; break }
        }
    }

    if ($browserExe) {
        Write-Host "Opening in an app window ($([IO.Path]::GetFileName($browserExe)))..." -ForegroundColor Cyan
        Write-Host 'Close that window to stop the server.'
        $browserProcess = Start-Process -FilePath $browserExe `
            -ArgumentList "--app=$AppUrl", "--user-data-dir=$UserDataDir" -PassThru
        Wait-Process -Id $browserProcess.Id
    } else {
        Write-Host 'Could not find Edge or Chrome for app-window mode -- opening in your default browser instead.' -ForegroundColor Yellow
        Write-Host 'Press Ctrl+C here to stop the server when you are done.'
        Start-Process $AppUrl
        Wait-Process -Id $serverProcess.Id
    }
} finally {
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Write-Host 'Stopping the Wordventure Bingo server...' -ForegroundColor Cyan
        # Kills the whole tree: cmd.exe -> npx -> node, since Stop-Process
        # alone would leave the actual Vite (node.exe) child running.
        Start-Process -FilePath 'taskkill.exe' -ArgumentList '/PID', $serverProcess.Id, '/T', '/F' `
            -WindowStyle Hidden -Wait
    }
}
