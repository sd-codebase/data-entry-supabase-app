#!/usr/bin/env bash
# Back up all local dev databases + images to $EMT_DEV_DATA/backups/<timestamp>.
# Keeps the newest $KEEP backups (default 14).
set -euo pipefail
cd "$(dirname "$0")"; source ./config.sh
KEEP="${KEEP:-14}"
if [ "$(docker inspect -f '{{.State.Running}}' "$DEV_MONGO_CONTAINER" 2>/dev/null)" != "true" ]; then
  echo "$(date '+%F %T') skip: dev mongo is not running (start it with npm run devdb:up)"; exit 0
fi
ts=$(date +%Y%m%d-%H%M%S)
dest="$EMT_DEV_DATA/backups/$ts"
mkdir -p "$dest"
dbs=$(dmongo mongosh --quiet --eval 'db.adminCommand({listDatabases:1}).databases.map(d=>d.name).filter(n=>!["admin","config","local"].includes(n)).join(" ")')
if [ -z "$dbs" ]; then echo "nothing to back up yet"; rmdir "$dest"; exit 0; fi
dmongo mongodump --quiet --gzip --archive > "$dest/mongo.archive.gz"
# Images: hard-link unchanged files against the previous backup to save space.
prev=$(ls -1d "$EMT_DEV_DATA"/backups/*/ 2>/dev/null | grep -v "/$ts/" | tail -1 || true)
if [ -n "$prev" ] && [ -d "${prev}images" ]; then
  rsync -a --link-dest="${prev}images" "$EMT_DEV_DATA/images/" "$dest/images/"
else
  rsync -a "$EMT_DEV_DATA/images/" "$dest/images/"
fi
echo "backup: $dest ($(du -sh "$dest" | cut -f1); dbs: $dbs)"
all=$(ls -1d "$EMT_DEV_DATA"/backups/*/ | sort)
n=$(echo "$all" | wc -l | tr -d ' ')
if (( n > KEEP )); then echo "$all" | head -n $((n - KEEP)) | while read -r old; do rm -rf "$old"; done; fi
