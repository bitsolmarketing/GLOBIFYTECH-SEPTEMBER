#!/usr/bin/env bash
#
# Globify Tech — database backup.
#
#   ./scripts/backup-db.sh                       # dump to ./backups
#   BACKUP_DIR=/srv/backups ./scripts/backup-db.sh
#
# Takes a compressed custom-format dump, prunes old ones, optionally uploads to
# S3, and pings the application so /admin/automation can show that backups are
# actually running. Run it from cron:
#
#   0 2 * * *  cd /srv/globify && ./scripts/backup-db.sh >> /var/log/globify-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/globify-${STAMP}.dump"

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f .env ]]; then
    # shellcheck disable=SC2046
    export $(grep -E '^DATABASE_URL=' .env | xargs -d '\n')
  fi
fi
: "${DATABASE_URL:?DATABASE_URL must be set}"

mkdir -p "$BACKUP_DIR"

echo "[backup] dumping to ${FILE}"
pg_dump --dbname="$DATABASE_URL" --format=custom --compress=9 --no-owner --no-privileges --file="$FILE"

SIZE="$(du -h "$FILE" | cut -f1)"
echo "[backup] wrote ${SIZE}"

# Fail loudly on a suspiciously small dump rather than silently keeping it.
MIN_BYTES="${BACKUP_MIN_BYTES:-10240}"
ACTUAL_BYTES="$(wc -c < "$FILE")"
if (( ACTUAL_BYTES < MIN_BYTES )); then
  echo "[backup] ERROR: dump is only ${ACTUAL_BYTES} bytes, expected at least ${MIN_BYTES}" >&2
  exit 1
fi

if [[ -n "${BACKUP_BUCKET:-}" ]]; then
  echo "[backup] uploading to s3://${BACKUP_BUCKET}/"
  aws s3 cp "$FILE" "s3://${BACKUP_BUCKET}/$(basename "$FILE")" --only-show-errors
fi

echo "[backup] pruning dumps older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name 'globify-*.dump' -type f -mtime "+${RETENTION_DAYS}" -delete

# Tell the application the backup succeeded, so a missing heartbeat is visible.
if [[ -n "${BACKUP_HEARTBEAT_SECRET:-}" && -n "${APP_URL:-${NEXT_PUBLIC_APP_URL:-}}" ]]; then
  BASE="${APP_URL:-${NEXT_PUBLIC_APP_URL}}"
  curl -fsS -X POST "${BASE}/api/internal/backup-heartbeat?source=backup-db.sh" \
    -H "Authorization: Bearer ${BACKUP_HEARTBEAT_SECRET}" >/dev/null && echo "[backup] heartbeat sent"
fi

echo "[backup] done"
