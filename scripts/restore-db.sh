#!/usr/bin/env bash
#
# Globify Tech — restore a dump produced by backup-db.sh.
#
#   ./scripts/restore-db.sh backups/globify-20260101-020000.dump
#
# This replaces the contents of the target database. It asks for confirmation
# unless FORCE=1, because there is no undo.
set -euo pipefail

FILE="${1:?usage: restore-db.sh <dump-file>}"
[[ -f "$FILE" ]] || { echo "No such file: $FILE" >&2; exit 1; }
: "${DATABASE_URL:?DATABASE_URL must be set}"

if [[ "${FORCE:-0}" != "1" ]]; then
  echo "This will overwrite the database at ${DATABASE_URL%%\?*}"
  read -r -p "Type 'restore' to continue: " answer
  [[ "$answer" == "restore" ]] || { echo "Cancelled."; exit 1; }
fi

echo "[restore] restoring ${FILE}"
pg_restore --dbname="$DATABASE_URL" --clean --if-exists --no-owner --no-privileges "$FILE"
echo "[restore] done. Run 'pnpm db:deploy' to apply any newer migrations."
