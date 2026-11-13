#!/usr/bin/env bash
# Start the local dev MongoDB container.
set -euo pipefail
cd "$(dirname "$0")"; source ./config.sh
mkdir -p "$EMT_DEV_DATA"/{work,images,backups}
EMT_DEV_DATA="$EMT_DEV_DATA" DEV_MONGO_PORT="$DEV_MONGO_PORT" docker compose -p emt-dev up -d
for i in $(seq 30); do
  dmongo mongosh --quiet --eval 'db.runCommand({ping:1}).ok' >/dev/null 2>&1 && { echo "dev mongo ready on 127.0.0.1:$DEV_MONGO_PORT"; exit 0; }
  sleep 1
done
echo "dev mongo did not start" >&2; exit 1
