# IEM BSH Backend API

Node.js/Express REST API for the IEM BSH Department website, deployed on a GCP Compute Engine VM with a co-located PostgreSQL database and Prisma ORM.

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Email**: Nodemailer (Gmail SMTP)
- **File Upload**: Multer
- **Deployment**: GCP Compute Engine VM, Caddy reverse proxy, PM2 process manager
- **CI/CD**: GitHub Actions (SSH deploy on push to `main`)

## Project Structure

```
.
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.js               # Database seeder
├── src/
│   └── server.js             # Express app + all routes
├── deploy/
│   ├── Caddyfile             # Caddy reverse proxy config
│   ├── setup-vm.sh           # One-shot VM bootstrap
│   ├── deploy.sh             # Per-deploy script (runs on VM)
│   └── backup.sh             # Nightly pg_dump
├── .github/workflows/
│   └── deploy.yml            # GitHub Actions → SSH → deploy.sh
├── ecosystem.config.cjs      # PM2 process manager config
└── package.json
```

## Environment Variables

Create a `.env` file in the project root with the following:

```env
# Server
PORT=6500

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Admin credentials (used during seeding)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# CORS — comma-separated origins, or * to allow all
CORS_ORIGINS=https://your-frontend.vercel.app

# Database (local or on-VM PostgreSQL)
# For local dev, both URLs are identical
DATABASE_URL="postgresql://USER@localhost:5432/iem_bsh"
DIRECT_URL="postgresql://USER@localhost:5432/iem_bsh"

# Upload directory (multer disk storage)
UPLOAD_DIR=./uploads             # local dev
# UPLOAD_DIR=/var/www/iem-bsh/uploads   # production VM

# Email (Gmail SMTP — use an App Password, not your account password)
# Leave blank to disable email notifications
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
ADMIN_EMAIL=primary_admin@example.com
ADMIN_EMAIL2=secondary_admin@example.com   # optional CC recipient
```

> For Gmail, generate an App Password at https://myaccount.google.com/apppasswords (requires 2FA enabled).

## Local Development

```bash
# Install dependencies
npm install

# Push schema to database
npm run db:push

# Seed initial data
npm run seed

# Start dev server (with hot reload)
npm run dev
```

The API will be available at `http://localhost:6500`.

## Deployment (GCP Compute Engine VM)

### Architecture

```
Internet ──HTTPS──▶ Caddy (:443) ──reverse_proxy──▶ Node/Express (:6500, pm2)
                                                          │
                                                          ├─▶ PostgreSQL 16 (localhost:5432)
                                                          └─▶ /var/www/iem-bsh/uploads/
```

A single GCP Compute Engine VM (Ubuntu 24.04 LTS, g1-small) runs:
- **Caddy** — TLS termination and HTTP→HTTPS redirect for `bshs-api.iem.edu.in` (auto-Let's Encrypt)
- **PM2** — keeps the Node process alive, handles log rotation, auto-restart on crash
- **PostgreSQL 16** — co-located with the app (no network hop)

### First-time VM setup

1. **Provision the VM** in GCP Console: Ubuntu 24.04 LTS, g1-small, reserve a static external IP, allow HTTP + HTTPS traffic.
2. **Coordinate DNS**: ask the `iem.edu.in` zone admin to add an A record:
   ```
   bshs-api.iem.edu.in.   A   <VM_STATIC_IP>
   ```
   Wait for `dig bshs-api.iem.edu.in` to resolve before continuing — Caddy needs this for TLS issuance.
3. **SSH in and bootstrap**:
   ```bash
   sudo bash deploy/setup-vm.sh
   ```
   This installs Node 20, PostgreSQL 16, Caddy, PM2; creates a `deploy` user; creates the `iem_bsh` database and role; installs the Caddyfile; opens UFW for 22/80/443.
4. **Add the GitHub Actions deploy public key** to `/home/deploy/.ssh/authorized_keys`.
5. **Clone the repo and create production `.env`**:
   ```bash
   sudo -u deploy git clone <repo-url> /var/www/iem-bsh
   sudo -u deploy nano /var/www/iem-bsh/.env
   # Set PORT=6500, NODE_ENV=production, UPLOAD_DIR=/var/www/iem-bsh/uploads,
   # DATABASE_URL/DIRECT_URL with the generated password, real JWT_SECRET,
   # ADMIN_EMAIL, CORS_ORIGINS, EMAIL_USER/EMAIL_PASS, etc.
   ```
6. **First deploy**:
   ```bash
   sudo -u deploy bash /var/www/iem-bsh/deploy/deploy.sh
   ```
7. **Verify**:
   ```bash
   curl https://bshs-api.iem.edu.in/api/batch/essential
   ```

### Required GitHub repo secrets

| Secret | Description |
|---|---|
| `VM_HOST` | Static external IP (or DNS name) of the GCP VM |
| `VM_USER` | SSH user (`deploy`) |
| `VM_SSH_KEY` | Private key matching the public key in `/home/deploy/.ssh/authorized_keys` |
| `VM_SSH_PORT` | Optional, defaults to `22` |

### Ongoing deploys

Push to `main`. The `.github/workflows/deploy.yml` workflow SSHes into the VM and runs `deploy/deploy.sh`, which pulls latest code, installs production deps, runs Prisma migrations, and reloads PM2.

For manual deploys, `ssh deploy@<vm> bash /var/www/iem-bsh/deploy/deploy.sh`.

### Logs

| Source | How to view |
|---|---|
| Node app | `pm2 logs iem-bsh-api` or `/var/log/iem-bsh/{out,error}.log` |
| Caddy access | `/var/log/caddy/bshs-api.log` (JSON) |
| Caddy service | `journalctl -u caddy -f` |
| PostgreSQL | `/var/log/postgresql/postgresql-16-main.log` |

### Backups

`deploy/backup.sh` runs `pg_dump`, gzips it, and keeps 14 days under `/var/backups/iem-bsh`. Schedule via root crontab:

```
0 2 * * *  /var/www/iem-bsh/deploy/backup.sh >> /var/log/iem-bsh/backup.log 2>&1
```

Graduate to GCS by uncommenting the `gsutil` block in the script once a service account and bucket are provisioned.

## Database

- Provider: **PostgreSQL 16** — Homebrew/Docker locally, co-located on the GCP VM in production
- ORM: **Prisma**
- `DATABASE_URL` and `DIRECT_URL` point to the same local connection in both environments — no pgbouncer split needed since we're not running on a serverless platform

```bash
# Apply schema changes
npm run db:push

# Open Prisma Studio (local DB browser)
npm run db:studio
```

## API Overview

| Prefix | Description |
|---|---|
| `GET /api/*` | Public read endpoints |
| `POST /api/auth/login` | Admin login — returns JWT |
| `POST /api/auth/change-password` | Change admin password (protected) |
| `POST/PUT/DELETE /api/admin/*` | Protected CRUD endpoints |
| `GET /api/batch/essential` | Batched essential data (department, faculty, events, notices, facilities, contact) |
| `GET /api/batch/optional` | Batched secondary data (all other collections) |

## Service Dependencies

| Service | Purpose |
|---|---|
| PostgreSQL 16 | Primary database (co-located on the VM in production) |
| Gmail SMTP | Login alerts and password change notifications (optional) |
| GCP Compute Engine | VM hosting |
| Caddy | Reverse proxy + automatic TLS via Let's Encrypt |
| GitHub Actions | CI/CD (push-to-deploy) |
