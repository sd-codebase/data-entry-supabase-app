# Shared settings for the local dev database scripts.
# Override any of these in your shell if needed.

# Local dev images, backups and temp files (Mongo files live in the docker volume emt-dev_mongo-data).
EMT_DEV_DATA="${EMT_DEV_DATA:-/Volumes/DevStorage/code/emt-dev-data}"

# Production VPS (read-only use in refresh; promote comes later).
VPS_HOST="${VPS_HOST:-root@189.72.146.80}"
VPS_KEY="${VPS_KEY:-$HOME/.ssh/id_ed25519}"
VPS_MONGO_CFG="/root/.emt-backup-mongo.yaml"   # read-all backup user, stays on the VPS

DEV_MONGO_CONTAINER="emt-dev-mongo"
DEV_MONGO_PORT="${DEV_MONGO_PORT:-27019}"

# Content collections copied between prod and dev. User data never leaves prod.
CONTENT_COLLECTIONS="courses subjects chapters topics paragraphs questions set_tests"

# exam key -> "<mongo db> <prod backend dir> <images folder>"
exam_info() {
  case "$1" in
    jeemains)    echo "jee-mains python-app-be jeemains" ;;
    neet)        echo "neet neet-backend neet" ;;
    jeeadvanced) echo "jee-advanced jeeadvanced-backend jeeadvanced" ;;
    mpscgs)      echo "mpsc-gs mpscgs-backend mpscgs" ;;
    *) return 1 ;;
  esac
}
ALL_EXAMS="jeemains neet jeeadvanced mpscgs"

ssh_vps() { ssh -o ConnectTimeout=15 -i "$VPS_KEY" "$VPS_HOST" "$@"; }
dmongo() { docker exec -i "$DEV_MONGO_CONTAINER" "$@"; }
