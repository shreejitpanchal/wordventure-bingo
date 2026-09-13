#!/usr/bin/env bash
# Dev tasks. The only place that knows how to build/test/lint/scan this repo.
# CI calls task names only. Keep dev.ps1 behaviourally identical.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
DIST="$REPO_ROOT/dist"
mkdir -p "$LOG_DIR"
cd "$REPO_ROOT"

export NO_COLOR=1

# --- output helpers ---------------------------------------------------------
c() { printf '\033[%sm%s\033[0m\n' "$1" "$2"; }
step() { c '1;36' "==> $*"; }
ok()   { c '1;32' "ok: $*"; }
warn() { c '1;33' "warn: $*"; }
die()  { c '1;31' "error: $*"; exit 1; }

now() { date +%Y-%m-%dT%H:%M:%S%z; }

# Truncate this task's log with a header, then everything tees onto it.
log_begin() {
  printf '=== %s | %s ===\n' "$(now)" "$1" > "$LOG_DIR/$1.log"
}

# finish <task> <exit-code> <elapsed-seconds>
finish() {
  local task=$1 code=$2 secs=$3 status
  if [ "$code" -eq 0 ]; then status=OK; else status="FAILED (exit $code)"; fi
  printf '%s | %s | %ss | %s\n' "$(now)" "$task" "$secs" "$status" \
    | tee -a "$LOG_DIR/$task.log"
}

# Strip ANSI/CSI so logs stay readable plain text.
strip_csi() { sed -E $'s/\x1b\\[[0-9;?]*[a-zA-Z]//g'; }

# run <task> <cmd...> -- tees combined output, returns the command's code.
run() {
  local task=$1; shift
  "$@" 2>&1 | strip_csi | tee -a "$LOG_DIR/$task.log"
  return "${PIPESTATUS[0]}"
}

# --- target resolution ------------------------------------------------------
# CI sets TARGET_OS/TARGET_ARCH; unset means host. Translate to the toolchain's
# own form here and nowhere else.
host_os()   { uname -s | tr '[:upper:]' '[:lower:]'; }
host_arch() { case "$(uname -m)" in x86_64|amd64) echo amd64;; aarch64|arm64) echo arm64;; *) uname -m;; esac; }
T_OS="${TARGET_OS:-$(host_os)}"
T_ARCH="${TARGET_ARCH:-$(host_arch)}"
BIN_NAME="$(basename "$REPO_ROOT")-$T_OS-$T_ARCH"
[ "$T_OS" = "windows" ] && BIN_NAME="$BIN_NAME.exe"

# --- tasks ------------------------------------------------------------------
# The web build is always the same (Vite -> dist/); TARGET_OS only changes
# what happens to that output afterward. A plain host build (TARGET_OS unset,
# used by `all`/`full` and the CI gates job) leaves the raw Vite bundle in
# dist/. TARGET_OS=android/windows is the release cross-build path from
# tag.yml's `binaries` job and additionally packages that bundle into a
# single named artifact so multiple targets can share one dist/ on merge.
task_build() {
  mkdir -p "$DIST"
  run build npm ci || return $?
  run build npm run build || return $?

  case "$T_OS" in
    android)
      # TODO: package the Vite output (dist/) into an Android APK/AAB once a
      # tool is chosen (Capacitor + Gradle, or Bubblewrap/TWA). Land the
      # result at "$DIST/$BIN_NAME.apk" and remove the raw web files from
      # dist/ so the release artifact is just the package.
      warn "android packaging not implemented (TARGET_OS=android)"; return 1
      ;;
    windows)
      # Only reached via an explicit TARGET_OS=windows cross-build (tag.yml's
      # binaries job runs this on ubuntu-24.04) -- NOT during an ordinary
      # Windows CI gate run, which uses dev.ps1, not this script.
      # TODO: package dist/ into a Windows package once a tool is chosen
      # (Electron/Tauri build, or a PWABuilder-generated MSIX). Land the
      # result at "$DIST/$BIN_NAME".
      warn "windows packaging not implemented (TARGET_OS=windows)"; return 1
      ;;
  esac
}

task_vet() {
  run vet npx eslint . || return $?
  run vet npx tsc --noEmit
}

task_test() {
  run test npx vitest run
}

task_cov() {
  # vitest prints the coverage summary (including the total) to stdout, which
  # `run` tees into logs/cov.log -- that satisfies "print the total".
  run cov npx vitest run --coverage
}

# build_image <log-task> -- unreachable: this project ships no container
# image (no Dockerfile), so task_image below always short-circuits before
# this runs. Left generic in case that ever changes.
build_image() {
  run "$1" docker build --progress=plain -t "$(basename "$REPO_ROOT"):dev" .
}

task_image() {
  [ -f "$REPO_ROOT/Dockerfile" ] || { warn "no Dockerfile; skipping image"; return 0; }
  build_image image
}

# One task, every applicable check. FATAL on fixable CVEs.
task_scan() {
  run scan npm audit --audit-level=high || return $?

  # Image half: only when this project ships an image, and never against a
  # stale one -- build first, because `image` is not in `all`.
  if [ -f "$REPO_ROOT/Dockerfile" ]; then
    build_image scan || return $?
    run scan docker run --rm --pull=always -e NO_COLOR=1 aquasec/trivy:latest image \
      --quiet --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed \
      "$(basename "$REPO_ROOT"):dev"
  fi
}

# No compose stack in this project (no backend) -- warn-and-skip rather than
# hard-fail if these are invoked; neither is in `all`/`full`.
task_up() {
  [ -f "$REPO_ROOT/docker-compose.yml" ] || [ -f "$REPO_ROOT/compose.yaml" ] \
    || { warn "no compose file; skipping up"; return 0; }
  run up docker compose up -d
}
task_down() {
  [ -f "$REPO_ROOT/docker-compose.yml" ] || [ -f "$REPO_ROOT/compose.yaml" ] \
    || { warn "no compose file; skipping down"; return 0; }
  run down docker compose down
}

# Interactive local-only task: serves the production build for manual
# checking. Not part of `all`/`full` -- there's nothing to assert here.
task_preview() { run preview npm run preview; }

# Local only: the graph is a developer artifact, not a CI output.
task_graphify() {
  [ -n "${CI:-}" ] && { warn "graphify is local-only; skipping in CI"; return 0; }
  if command -v graphify >/dev/null 2>&1; then
    run graphify graphify update .
  elif python -m graphify --help >/dev/null 2>&1; then
    run graphify python -m graphify update .
  else
    warn "graphify not available; skipping"; return 0
  fi
}

# --- dispatch ---------------------------------------------------------------
ALL="build vet test"
FULL="build vet test cov image scan graphify"

usage() {
  cat <<EOF
usage: $(basename "$0") <task>...

  build vet test cov scan image up down graphify preview
  all   = $ALL            (what CI runs, as: all scan)
  full  = $FULL           (pre-tag sweep)
EOF
}

expand() {
  case "$1" in
    all)  echo "$ALL" ;;
    full) echo "$FULL" ;;
    *)    echo "$1" ;;
  esac
}

[ $# -eq 0 ] && { usage; exit 0; }
case "${1:-}" in -h|--help|help) usage; exit 0 ;; esac

TASKS=""
for a in "$@"; do TASKS="$TASKS $(expand "$a")"; done

FAILED=0
for task in $TASKS; do
  type "task_$task" >/dev/null 2>&1 || die "unknown task: $task"
  step "$task"
  log_begin "$task"
  start=$SECONDS
  code=0
  "task_$task" || code=$?
  finish "$task" "$code" "$((SECONDS - start))"
  if [ "$code" -ne 0 ]; then
    FAILED=1
    warn "$task failed; stopping"
    break   # build/vet/test/scan are all fatal
  fi
  ok "$task"
done
exit "$FAILED"
