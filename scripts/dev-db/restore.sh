#!/usr/bin/env bash
# Restore local dev databases + images from a backup folder.
#   scripts/dev-db/restore.sh <backup-folder-name>   (see $EMT_DEV_DATA/backups)
set -euo pipefail
cd "$(dirname "$0")"; source ./config.sh
b="$EMT_DEV_DATA/backups/${1:?usage: restore.sh <backup-name>}"
[ -f "$b/mongo.archive.gz" ] || { echo "no backup at $b" >&2; exit 1; }
./backup.sh   # safety copy of the current state first
dmongo mongorestore --quiet --gzip --archive --drop < "$b/mongo.archive.gz"
rsync -a --delete "$b/images/" "$EMT_DEV_DATA/images/"
echo "restored from $b"
