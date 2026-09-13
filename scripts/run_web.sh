#!/usr/bin/env bash
# Launches Wordventure Bingo as a normal browser tab, with hot reload.
# Installs dependencies on first run, then starts the Vite dev server and
# opens it in the default browser. Windows equivalent: run_web.ps1.
#
# Port is configurable via WORDVENTURE_WEB_PORT (default 5173):
#   WORDVENTURE_WEB_PORT=9000 ./scripts/run_web.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

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
    # node_modules already exists, but package.json may have grown a new
    # dependency since it was last installed (e.g. a git pull) -- npm install
    # is a fast no-op when everything's already satisfied, so it's cheap to
    # re-sync on every launch rather than silently running with a stale tree.
    npm install --no-audit --no-fund --quiet || \
        echo "Warning: could not verify packages are up to date (check your internet connection). Continuing anyway."
fi

: "${WORDVENTURE_WEB_PORT:=5173}"
export WORDVENTURE_WEB_PORT

# Ctrl+C on a previous run doesn't always kill Vite's Node process cleanly --
# it can be left listening on the port, which then makes the next launch
# fail with a confusing "port in use" error instead of just working.
# Self-heal: if a leftover Node process still owns the port, stop it first.
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
    fi
fi

echo "============================================"
echo "  Wordventure Bingo starting on port $WORDVENTURE_WEB_PORT"
echo "  Opens automatically in your browser."
echo "  Press Ctrl+C to stop."
echo "============================================"
echo

npx vite --port "$WORDVENTURE_WEB_PORT" --open
