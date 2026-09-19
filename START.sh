#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/arx-app/backends/musicdesigner"
LOG_FILE="$PROJECT_DIR/server.log"
PID_FILE="$PROJECT_DIR/server.pid"

cd "$PROJECT_DIR"

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ "$EXISTING_PID" =~ ^[0-9]+$ ]] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "HTTPS API server is already running with PID $EXISTING_PID."
    exit 0
  fi
  rm -f "$PID_FILE"
fi

nohup npm run server >>"$LOG_FILE" 2>&1 </dev/null &
SERVER_PID=$!
echo "$SERVER_PID" >"$PID_FILE"

echo "HTTPS API server started with PID $SERVER_PID. Log: $LOG_FILE"