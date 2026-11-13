#!/usr/bin/env bash
# Install a macOS launchd job that runs backup.sh every day at 21:00
# (and at login if the Mac was off at 21:00). Remove with: install-daily-backup.sh --remove
set -euo pipefail
cd "$(dirname "$0")"; source ./config.sh
label="in.entrancemocktest.dev-db-backup"
plist="$HOME/Library/LaunchAgents/$label.plist"
launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
if [ "${1:-}" = "--remove" ]; then rm -f "$plist"; echo "daily backup removed"; exit 0; fi
mkdir -p "$EMT_DEV_DATA/backups"
cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$PWD/backup.sh</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>21</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$EMT_DEV_DATA/backups/backup.log</string>
  <key>StandardErrorPath</key><string>$EMT_DEV_DATA/backups/backup.log</string>
</dict></plist>
PLIST
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "daily backup installed ($plist), log: $EMT_DEV_DATA/backups/backup.log"
