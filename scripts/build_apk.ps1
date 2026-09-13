#requires -Version 5.1
# Builds an Android APK from the deployed PWA using Bubblewrap (Google's
# official PWA -> Trusted Web Activity tool). This wraps the *hosted* site
# in a native shell -- it does not bundle dist/ into the APK -- so it
# reuses the exact same manifest + service worker as the browser/home-screen
# install, with no separate native build to keep in sync.
#
# Hard prerequisite: the app must already be deployed to a real public
# HTTPS URL (GitHub Pages/Netlify/Vercel -- see the "Known open item" in
# CLAUDE.md, still unresolved as of this script's authoring). A TWA loads
# that URL at runtime and Android verifies ownership of the domain via a
# Digital Asset Links file Bubblewrap generates
# (https://developers.google.com/digital-asset-links) -- there is no way to
# point this at localhost for a real build.
#
# First run: `bubblewrap init` scaffolds android/twa-manifest.json and an
# Android project, generating a signing keystore and prompting for its
# password interactively (never pass --password on the command line or set
# it as a plain env var here -- that would put a secret in shell history /
# process listings). Subsequent runs reuse that project and just rebuild.

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$AndroidDir = Join-Path $RepoRoot 'android'
$TwaManifest = Join-Path $AndroidDir 'twa-manifest.json'
$OutDir = Join-Path $RepoRoot 'dist-apk'
$BuildNumberFile = Join-Path $RepoRoot 'BUILD_NUMBER'

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js/npm was not found on this computer.' -ForegroundColor Red
    Write-Host 'Install it from https://nodejs.org, then run this script again.'
    exit 1
}

if (-not $env:WORDVENTURE_HOSTED_URL) {
    Write-Host 'WORDVENTURE_HOSTED_URL is not set.' -ForegroundColor Red
    Write-Host ''
    Write-Host 'Bubblewrap wraps the LIVE, publicly hosted PWA -- it cannot' -ForegroundColor Red
    Write-Host 'package a local dev server. Deploy dist/ (GitHub Pages,'    -ForegroundColor Red
    Write-Host 'Netlify, or Vercel), then set the URL and re-run, e.g.:'   -ForegroundColor Red
    Write-Host ''
    Write-Host '  $env:WORDVENTURE_HOSTED_URL = "https://you.github.io/wordventure-bingo"'
    Write-Host '  .\scripts\build_apk.ps1'
    exit 1
}
$SiteUrl = $env:WORDVENTURE_HOSTED_URL.TrimEnd('/')
$ManifestUrl = "$SiteUrl/manifest.webmanifest"
$PackageId = if ($env:WORDVENTURE_ANDROID_PACKAGE_ID) { $env:WORDVENTURE_ANDROID_PACKAGE_ID } else { 'com.wordventurebingo.app' }

npm install --no-audit --no-fund --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host 'npm install failed -- fix that before building.' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $TwaManifest)) {
    Write-Host '============================================' -ForegroundColor Cyan
    Write-Host '  First-time Bubblewrap setup for'             -ForegroundColor Cyan
    Write-Host '  Wordventure Bingo. This scaffolds the'       -ForegroundColor Cyan
    Write-Host '  Android project and a NEW signing keystore.' -ForegroundColor Cyan
    Write-Host '============================================' -ForegroundColor Cyan
    Write-Host ''
    Write-Host "Manifest:  $ManifestUrl"
    Write-Host "Package:   $PackageId"
    Write-Host ''
    Write-Host 'You will be prompted to choose a keystore password -- write it down' -ForegroundColor Yellow
    Write-Host 'somewhere safe. Every future update APK must be signed with the same' -ForegroundColor Yellow
    Write-Host 'key, and android/android.keystore is gitignored on purpose (it is a' -ForegroundColor Yellow
    Write-Host 'secret, never commit it). Losing it means you can never publish an' -ForegroundColor Yellow
    Write-Host 'update to an existing Play Store listing under this package ID.' -ForegroundColor Yellow
    Write-Host ''

    npx --yes @bubblewrap/cli init --manifest $ManifestUrl --directory $AndroidDir --packageId $PackageId
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'bubblewrap init failed -- see the errors above.' -ForegroundColor Red
        exit 1
    }
} else {
    # Re-sync twa-manifest.json with the live manifest (icon/theme-color/name
    # changes since the last build) before compiling.
    Push-Location $AndroidDir
    try {
        npx --yes @bubblewrap/cli update --manifest $ManifestUrl
        if ($LASTEXITCODE -ne 0) {
            Write-Host 'bubblewrap update failed -- see the errors above.' -ForegroundColor Red
            exit 1
        }
    } finally {
        Pop-Location
    }
}

# Android requires versionCode to strictly increase between installs of the
# same package -- BUILD_NUMBER is a plain repo-root counter (same convention
# as this app's original devops scaffold), bumped here and written into
# twa-manifest.json before every build.
$prevBuild = if (Test-Path $BuildNumberFile) { [int](Get-Content $BuildNumberFile -Raw) } else { 0 }
$newBuild = $prevBuild + 1
Set-Content -Path $BuildNumberFile -Value $newBuild -NoNewline

$manifestJson = Get-Content $TwaManifest -Raw | ConvertFrom-Json
$manifestJson.appVersionCode = $newBuild
$manifestJson | ConvertTo-Json -Depth 20 | Set-Content -Path $TwaManifest -Encoding utf8
$appVersion = $manifestJson.appVersionName

Write-Host ''
Write-Host "Building Android APK (v$appVersion build $newBuild)..." -ForegroundColor Cyan
Write-Host ''

Push-Location $AndroidDir
try {
    npx --yes @bubblewrap/cli build
    $buildExit = $LASTEXITCODE
} finally {
    Pop-Location
}
if ($buildExit -ne 0) {
    Write-Host 'bubblewrap build failed -- see the errors above.' -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$builtApk = Join-Path $AndroidDir 'app-release-signed.apk'
$taggedApk = Join-Path $OutDir "wordventure-bingo-v$appVersion-build$newBuild.apk"
if (Test-Path $builtApk) {
    Move-Item -Path $builtApk -Destination $taggedApk -Force
    Write-Host ''
    Write-Host "Done -- APK at $taggedApk" -ForegroundColor Green
} else {
    Write-Host ''
    Write-Host "bubblewrap reported success but $builtApk wasn't found." -ForegroundColor Yellow
    Write-Host "Check android/app/build/outputs/apk/ for the actual output path" -ForegroundColor Yellow
    Write-Host "-- Bubblewrap's output filename has changed between versions before." -ForegroundColor Yellow
}
