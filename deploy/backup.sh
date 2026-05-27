#!/usr/bin/env bash
# Nightly Postgres backup. Add to root crontab:
#   0 2 * * *  /var/www/iem-bsh/deploy/backup.sh >> /var/log/iem-bsh/backup.log 2>&1
#
# Stores compressed dumps in /var/backups/iem-bsh and keeps the last 14 days.
# Graduate to GCS by uncommenting the gsutil block below once a service account
# and bucket are provisioned.

set -euo pipefail

DB_NAME="${DB_NAME:-iem_bsh}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/iem-bsh}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
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

echo "[$(date -Iseconds)] Backup complete"
