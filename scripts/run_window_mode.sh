#!/usr/bin/env bash
# Launches Wordventure Bingo in its own chromeless app window (no address
# bar/tabs) instead of a regular browser tab -- closer to how it'll feel
# once installed as a PWA. Installs dependencies on first run, starts the
# dev server in the background, waits for it to be ready, then opens it in
# an app window. Closing that window stops the server automatically.
# Windows equivalent: run_window_mode.ps1 (prefer that on Windows -- this
# script's app-window detection is verified on Windows/Git Bash and macOS;
# Linux browser process lifecycle can vary by distro/browser version).
#
# Port is configurable via WORDVENTURE_WEB_PORT (default 5173).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
cd "$REPO_ROOT"
mkdir -p "$LOG_DIR"

if [ ! -d "node_modules" ]; then
    echo "============================================"
    echo "  Setting up Wordventure Bingo for the"
    echo "  first time. This only happens once and"
    echo "  may take a minute..."
    echo "============================================"
    echo

    if ! command -v npm >/dev/null 2>&1; then
        echo "Node.js/npm was not found on this computer."
        echo "Please install it from https://nodejs.org then run this again."
        read -p "Press Enter to close..."
        exit 1
    fi

    npm install

    echo
    echo "Setup complete!"
    echo
else
    npm install --no-audit --no-fund --quiet || \
        echo "Warning: could not verify packages are up to date (check your internet connection). Continuing anyway."
fi

: "${WORDVENTURE_WEB_PORT:=5173}"
export WORDVENTURE_WEB_PORT
APP_URL="http://localhost:$WORDVENTURE_WEB_PORT"

port_owner_pid() {
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti tcp:"$1" -sTCP:LISTEN 2>/dev/null | head -n1
    elif command -v netstat >/dev/null 2>&1; then
        netstat -ano 2>/dev/null | awk -v p=":$1" '$0 ~ p && $0 ~ /LISTENING/ {print $NF; exit}'
    fi
}

is_node_process() {
    if command -v ps >/dev/null 2>&1 && ps -p "$1" -o comm= >/dev/null 2>&1; then
        ps -p "$1" -o comm= | grep -qi node
    elif command -v powershell.exe >/dev/null 2>&1; then
        powershell.exe -NoProfile -Command "(Get-Process -Id $1 -ErrorAction SilentlyContinue).ProcessName" 2>/dev/null | grep -qi node
    else
        return 1
    fi
}

EXISTING_PID="$(port_owner_pid "$WORDVENTURE_WEB_PORT")"
if [ -n "$EXISTING_PID" ]; then
    if is_node_process "$EXISTING_PID"; then
        echo "Stopping a leftover Wordventure Bingo server on port $WORDVENTURE_WEB_PORT (PID $EXISTING_PID)..."
        kill -9 "$EXISTING_PID" 2>/dev/null \
            || (command -v powershell.exe >/dev/null 2>&1 && powershell.exe -NoProfile -Command "Stop-Process -Id $EXISTING_PID -Force" 2>/dev/null) \
            || true
        sleep 1
    else
        echo "Warning: port $WORDVENTURE_WEB_PORT is already in use by PID $EXISTING_PID, which is not a Node process -- leaving it alone."
        echo "Set WORDVENTURE_WEB_PORT to a free port instead."
        exit 1
    fi
fi

echo "Starting Wordventure Bingo..."
npx vite --port "$WORDVENTURE_WEB_PORT" > "$LOG_DIR/run_window_mode.log" 2>&1 &
SERVER_PID=$!

cleanup() {
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "Stopping the Wordventure Bingo server..."
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Poll instead of a fixed sleep -- a fixed delay is either too short (window
# opens to a connection error) or too long (annoying every launch).
READY=0
DEADLINE=$((SECONDS + 30))
while [ "$SECONDS" -lt "$DEADLINE" ]; do
    if command -v curl >/dev/null 2>&1 && curl -sf "$APP_URL" >/dev/null 2>&1; then
        READY=1
        break
    fi
    sleep 1
done
if [ "$READY" -ne 1 ]; then
    echo "The app server did not start in time. Check $LOG_DIR/run_window_mode.log for errors."
    exit 1
fi

# A dedicated profile dir keeps this "app window" browser instance separate
# from the user's normal browsing profile and its open tabs.
PROFILE_DIR="${TMPDIR:-/tmp}/wordventure-bingo-app-window"
mkdir -p "$PROFILE_DIR"

open_app_window() {
    local url="$1"
    case "$(uname -s)" in
        Darwin)
            # -W makes `open` block until the launched app quits, which is
            # what lets the cleanup trap fire at the right time.
            if [ -d "/Applications/Microsoft Edge.app" ]; then
                open -W -na "Microsoft Edge" --args --app="$url" --user-data-dir="$PROFILE_DIR"
            elif [ -d "/Applications/Google Chrome.app" ]; then
                open -W -na "Google Chrome" --args --app="$url" --user-data-dir="$PROFILE_DIR"
            else
                return 1
            fi
            ;;
        Linux)
            for exe in microsoft-edge microsoft-edge-stable google-chrome google-chrome-stable chromium-browser chromium; do
                if command -v "$exe" >/dev/null 2>&1; then
                    "$exe" --app="$url" --user-data-dir="$PROFILE_DIR"
                    return 0
                fi
            done
            return 1
            ;;
        MINGW*|MSYS*|CYGWIN*)
            for candidate in \
                "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
                "/c/Program Files/Microsoft/Edge/Application/msedge.exe" \
                "/c/Program Files/Google/Chrome/Application/chrome.exe" \
                "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"; do
                if [ -f "$candidate" ]; then
                    "$candidate" --app="$url" --user-data-dir="$PROFILE_DIR"
                    return 0
                fi
            done
            return 1
            ;;
        *)
            return 1
            ;;
    esac
}

echo "Opening in an app window..."
echo "Close that window to stop the server."
if ! open_app_window "$APP_URL"; then
    echo "Could not find Edge or Chrome for app-window mode -- opening in your default browser instead."
    echo "Press Ctrl+C here to stop the server when you are done."
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$APP_URL" >/dev/null 2>&1 || true
    elif command -v open >/dev/null 2>&1; then
        open "$APP_URL" || true
    fi
    wait "$SERVER_PID"
fi
