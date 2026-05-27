#!/usr/bin/env bash
# One-shot VM bootstrap for the IEM BSH backend.
# Idempotent: safe to re-run. Designed for Ubuntu 22.04 LTS.
#
# Usage:
#   sudo bash deploy/setup-vm.sh
#
# After running, copy production .env into the project, then:
#   sudo -u deploy bash deploy/deploy.sh

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/var/www/iem-bsh}"
LOG_DIR="${LOG_DIR:-/var/log/iem-bsh}"
DB_NAME="${DB_NAME:-iem_bsh}"
DB_USER="${DB_USER:-iem_bsh}"
NODE_MAJOR="${NODE_MAJOR:-20}"

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (use sudo)." >&2
  exit 1
fi

echo "==> Updating apt indexes"
apt-get update -y

echo "==> Installing base packages"
apt-get install -y curl ca-certificates gnupg lsb-release ufw git

echo "==> Installing Node.js ${NODE_MAJOR}.x"
if ! command -v node >/dev/null || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" != "${NODE_MAJOR}" ]]; then
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  chmod 0644 /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
fi

echo "==> Installing PostgreSQL 16"
if ! command -v psql >/dev/null; then
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -y
  apt-get install -y postgresql-16
fi
systemctl enable --now postgresql

echo "==> Installing Caddy"
if ! command -v caddy >/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> Installing PM2 globally"
npm install -g pm2

echo "==> Creating deploy user '${DEPLOY_USER}'"
if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "${DEPLOY_USER}"
fi
install -d -m 0700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chmod 0600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
echo "    -> Add the GitHub Actions public key to /home/${DEPLOY_USER}/.ssh/authorized_keys"

echo "==> Creating application directories"
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${APP_DIR}"
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${APP_DIR}/uploads"
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${LOG_DIR}"

echo "==> Creating PostgreSQL role and database"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}'" | grep -q 1 || {
  DB_PASS="$(openssl rand -hex 24)"
  sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';"
  echo "    -> Generated DB password for ${DB_USER}: ${DB_PASS}"
  echo "    -> Put this into the production .env as DATABASE_URL / DIRECT_URL"
}
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1 || {
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
}

echo "==> Configuring UFW firewall (22, 80, 443)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Installing Caddyfile"
install -m 0644 "$(dirname "$0")/Caddyfile" /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy

echo "==> Setting up PM2 to start on boot (as ${DEPLOY_USER})"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "${DEPLOY_USER}" --hp "/home/${DEPLOY_USER}"

cat <<EOF

✅  VM bootstrap complete.

Next steps:
  1. Add the GitHub Actions deploy public key to:
       /home/${DEPLOY_USER}/.ssh/authorized_keys
  2. Clone the repo as the deploy user:
       sudo -u ${DEPLOY_USER} git clone <repo-url> ${APP_DIR}
  3. Place production .env at:
       ${APP_DIR}/.env
     (set UPLOAD_DIR=${APP_DIR}/uploads, PORT=6500, DATABASE_URL/DIRECT_URL with the password above)
  4. Run the deploy:
       sudo -u ${DEPLOY_USER} bash ${APP_DIR}/deploy/deploy.sh
  5. Verify:
       curl https://bshs-api.iem.edu.in/api/batch/essential

EOF
