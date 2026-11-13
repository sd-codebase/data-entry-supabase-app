#!/usr/bin/env bash
# Replace local dev content with a fresh copy of production (read-only on prod).
#   scripts/dev-db/refresh-from-prod.sh [exam ...]   exams: jeemains neet jeeadvanced mpscgs (default: all)
# Copies only content collections + images. Local dev data for those exams is
# overwritten, so a local backup is taken first.
set -euo pipefail
cd "$(dirname "$0")"; source ./config.sh
exams="${*:-$ALL_EXAMS}"
for e in $exams; do exam_info "$e" >/dev/null || { echo "unknown exam: $e" >&2; exit 1; }; done

./up.sh
./backup.sh

for e in $exams; do
  read -r db appdir imgdir <<<"$(exam_info "$e")"
  echo "== $e ($db)"
  tmp="$EMT_DEV_DATA/work/refresh-$db"; rm -rf "$tmp"; mkdir -p "$tmp"
  # Dump each content collection on the VPS and stream it back as a tar.
  ssh_vps "set -e; t=\$(mktemp -d); for c in $CONTENT_COLLECTIONS; do
      mongodump --quiet --config=$VPS_MONGO_CFG --db='$db' --collection=\$c --gzip --out=\$t; done
      tar -C \$t -cf - .; rm -rf \$t" | tar -C "$tmp" -xf -
  # Replace the dev copies of those collections (other local collections untouched).
  docker exec "$DEV_MONGO_CONTAINER" rm -rf "/tmp/refresh-$db"
  docker cp -q "$tmp" "$DEV_MONGO_CONTAINER:/tmp/refresh-$db"
  dmongo mongorestore --quiet --gzip --drop --nsInclude="$db.*" --dir="/tmp/refresh-$db"
  docker exec "$DEV_MONGO_CONTAINER" rm -rf "/tmp/refresh-$db"
  rm -rf "$tmp"
  dmongo mongosh --quiet --eval "const d=db.getSiblingDB('$db'); print('  '+'$CONTENT_COLLECTIONS'.split(' ').map(c=>c+'='+d[c].countDocuments()).join(' '))"
  # Images
  mkdir -p "$EMT_DEV_DATA/images/$imgdir"
  rsync -a --delete -e "ssh -i $VPS_KEY" "$VPS_HOST:/var/www/apps/$appdir/resources-data/$imgdir/" "$EMT_DEV_DATA/images/$imgdir/"
  echo "  images: $(find "$EMT_DEV_DATA/images/$imgdir" -type f | wc -l | tr -d ' ') files"
done
echo "done. dev mongo: mongodb://127.0.0.1:$DEV_MONGO_PORT"
