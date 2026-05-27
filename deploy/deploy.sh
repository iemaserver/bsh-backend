#!/usr/bin/env bash
# Per-deploy script. Runs on the VM as the deploy user.
# Triggered by .github/workflows/deploy.yml or invoked manually.

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/iem-bsh}"
BRANCH="${BRANCH:-main}"

cd "${APP_DIR}"

echo "==> Fetching latest code"
git fetch --prune origin
git reset --hard "origin/${BRANCH}"

echo "==> Installing production dependencies"
npm ci --omit=dev

echo "==> Generating Prisma client"
npx prisma generate

echo "==> Applying database migrations"
# Use `migrate deploy` once migrations exist in prisma/migrations/.
# Until then, `db push` is acceptable for the initial bootstrap.
if [[ -d prisma/migrations ]]; then
  npx prisma migrate deploy
else
  npx prisma db push --skip-generate --accept-data-loss=false
fi

echo "==> Reloading PM2"
if pm2 describe iem-bsh-api >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
  pm2 save
fi

echo "==> Deploy complete"
pm2 status iem-bsh-api
