#!/usr/bin/env bash
# Builds an Android APK from the deployed PWA using Bubblewrap (Google's
# official PWA -> Trusted Web Activity tool). This wraps the *hosted* site
# in a native shell -- it does not bundle dist/ into the APK -- so it
# reuses the exact same manifest + service worker as the browser/home-screen
# install, with no separate native build to keep in sync. Windows
# equivalent: build_apk.ps1.
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
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

ANDROID_DIR="$REPO_ROOT/android"
TWA_MANIFEST="$ANDROID_DIR/twa-manifest.json"
OUT_DIR="$REPO_ROOT/dist-apk"
BUILD_NUMBER_FILE="$REPO_ROOT/BUILD_NUMBER"

if ! command -v npm >/dev/null 2>&1; then
    echo "Node.js/npm was not found on this computer."
    echo "Install it from https://nodejs.org, then run this script again."
    exit 1
fi

if [ -z "${WORDVENTURE_HOSTED_URL:-}" ]; then
    echo "WORDVENTURE_HOSTED_URL is not set."
    echo
    echo "Bubblewrap wraps the LIVE, publicly hosted PWA -- it cannot"
    echo "package a local dev server. Deploy dist/ (GitHub Pages,"
    echo "Netlify, or Vercel), then set the URL and re-run, e.g.:"
    echo
    echo '  WORDVENTURE_HOSTED_URL="https://you.github.io/wordventure-bingo" ./scripts/build_apk.sh'
    exit 1
fi
SITE_URL="${WORDVENTURE_HOSTED_URL%/}"
MANIFEST_URL="$SITE_URL/manifest.webmanifest"
PACKAGE_ID="${WORDVENTURE_ANDROID_PACKAGE_ID:-com.wordventurebingo.app}"

npm install --no-audit --no-fund --quiet

if [ ! -f "$TWA_MANIFEST" ]; then
    echo "============================================"
    echo "  First-time Bubblewrap setup for"
    echo "  Wordventure Bingo. This scaffolds the"
    echo "  Android project and a NEW signing keystore."
    echo "============================================"
    echo
    echo "Manifest:  $MANIFEST_URL"
    echo "Package:   $PACKAGE_ID"
    echo
    echo "You will be prompted to choose a keystore password -- write it down"
    echo "somewhere safe. Every future update APK must be signed with the same"
    echo "key, and android/android.keystore is gitignored on purpose (it is a"
    echo "secret, never commit it). Losing it means you can never publish an"
    echo "update to an existing Play Store listing under this package ID."
    echo

    npx --yes @bubblewrap/cli init --manifest "$MANIFEST_URL" --directory "$ANDROID_DIR" --packageId "$PACKAGE_ID"
else
    # Re-sync twa-manifest.json with the live manifest (icon/theme-color/name
    # changes since the last build) before compiling.
    (cd "$ANDROID_DIR" && npx --yes @bubblewrap/cli update --manifest "$MANIFEST_URL")
fi

# Android requires versionCode to strictly increase between installs of the
# same package -- BUILD_NUMBER is a plain repo-root counter (same convention
# as this app's original devops scaffold), bumped here and written into
# twa-manifest.json before every build.
PREV_BUILD=0
[ -f "$BUILD_NUMBER_FILE" ] && PREV_BUILD="$(cat "$BUILD_NUMBER_FILE")"
NEW_BUILD=$((PREV_BUILD + 1))
echo "$NEW_BUILD" > "$BUILD_NUMBER_FILE"

node -e "
const fs = require('fs');
const path = '$TWA_MANIFEST';
const m = JSON.parse(fs.readFileSync(path, 'utf8'));
m.appVersionCode = $NEW_BUILD;
fs.writeFileSync(path, JSON.stringify(m, null, 2));
console.log(m.appVersionName);
" > /tmp/wordventure-apk-version.txt
APP_VERSION="$(cat /tmp/wordventure-apk-version.txt)"
rm -f /tmp/wordventure-apk-version.txt

echo
echo "Building Android APK (v$APP_VERSION build $NEW_BUILD)..."
echo

(cd "$ANDROID_DIR" && npx --yes @bubblewrap/cli build)

mkdir -p "$OUT_DIR"
BUILT_APK="$ANDROID_DIR/app-release-signed.apk"
TAGGED_APK="$OUT_DIR/wordventure-bingo-v${APP_VERSION}-build${NEW_BUILD}.apk"
if [ -f "$BUILT_APK" ]; then
    mv "$BUILT_APK" "$TAGGED_APK"
    echo
    echo "Done -- APK at $TAGGED_APK"
else
    echo
    echo "bubblewrap reported success but $BUILT_APK wasn't found."
    echo "Check android/app/build/outputs/apk/ for the actual output path"
    echo "-- Bubblewrap's output filename has changed between versions before."
fi
