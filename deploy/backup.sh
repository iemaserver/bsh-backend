#!/usr/bin/env bash
# Nightly Postgres backup. Add to root crontab:
#   0 2 * * *  /var/www/iem-bsh/deploy/backup.sh >> /var/log/iem-bsh/backup.log 2>&1
#
# Retention is dual-bounded to prevent unbounded disk growth:
#   - Age limit:  delete files older than RETENTION_DAYS (default 14)
#   - Count limit: keep at most RETENTION_COUNT files (default 10)
# Both rules run on every execution; whichever is stricter wins.
#
# Graduate to GCS by uncommenting the gsutil block below once a service account
# and bucket are provisioned.

set -euo pipefail

DB_NAME="${DB_NAME:-iem_bsh}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/iem-bsh}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
RETENTION_COUNT="${RETENTION_COUNT:-10}"
# GCS_BUCKET="${GCS_BUCKET:-gs://iem-bsh-backups}"

install -d -m 0750 "${BACKUP_DIR}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTFILE="${BACKUP_DIR}/${DB_NAME}-${TIMESTAMP}.sql.gz"

echo "[$(date -Iseconds)] Dumping ${DB_NAME} to ${OUTFILE}"
sudo -u postgres pg_dump --no-owner --clean --if-exists "${DB_NAME}" | gzip -9 > "${OUTFILE}"
chmod 0640 "${OUTFILE}"

# Optional: ship to GCS
# gsutil cp "${OUTFILE}" "${GCS_BUCKET}/"

echo "[$(date -Iseconds)] Pruning backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name "${DB_NAME}-*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date -Iseconds)] Pruning excess backups beyond last ${RETENTION_COUNT}"
# List files newest-first; skip the first RETENTION_COUNT; delete the rest.
# Uses -print0 / xargs -0 to handle filenames with spaces safely.
find "${BACKUP_DIR}" -name "${DB_NAME}-*.sql.gz" -printf '%T@ %p\0' \
  | sort -z -rn \
  | awk -v keep="${RETENTION_COUNT}" 'BEGIN{RS=ORS="\0"} NR>keep{print $2}' \
  | xargs -0 -r rm -v

echo "[$(date -Iseconds)] Backup complete"
