# Migration Walkthrough: Vercel + Supabase → GCP Compute Engine VM

## What Was Done

### Phase 1 — Local Dev Setup (prior session)

- Switched database config from Supabase (pgbouncer split on ports 6543/5432) to local Homebrew PostgreSQL (`localhost:5432/iem_bsh`)
- Created `.env` for local development with all required variables
- Fixed stale `backend-node/` path references throughout `README.md`
- Added `UPLOAD_DIR` env var support; local dev defaults to `./uploads`
- Changed default port from 5000 → 6500 (5000/6000 were occupied by macOS Control Center / AirPlay Receiver)
- Created `.claude/launch.json` with `autoPort: true` so the preview tool picks a free port and injects it via `PORT`

### Phase 2 — Vercel Removal & Server Hardening

**Deleted:**
- `vercel.json`
- `api/index.js` (Vercel serverless entry point — `export default app`)

**`src/server.js` changes:**
- Removed `if (process.env.VERCEL !== '1')` guard around `app.listen()` — server now always binds
- Replaced hardcoded `../puppeteer_assets` upload path with `process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')`, creating the directory at startup if it doesn't exist
- Changed upload response URL from `puppeteer_assets/<file>` → `/uploads/<file>`
- Added `app.use('/uploads', express.static(uploadDir))` to serve uploaded files
- Fixed a semgrep CWE-134 finding: `console.error` template literal → separate string args
- `const PORT = process.env.PORT || 6500`

### Phase 3 — GCP VM Deploy Infrastructure

All files committed in `feat: migrate hosting from vercel to gcp compute engine vm` (commit `37918f4`):

| File | Purpose |
|---|---|
| `ecosystem.config.cjs` | PM2 process config (`.cjs` extension required — `package.json` has `"type":"module"`) |
| `deploy/Caddyfile` | Caddy reverse proxy: `bshs-api.iem.edu.in` → `localhost:6500`, gzip, 20 MB body limit, JSON access logs |
| `deploy/setup-vm.sh` | One-shot Ubuntu 24.04 bootstrap: Node 20 (NodeSource apt repo), PostgreSQL 16, Caddy, PM2, `deploy` OS user, `iem_bsh` DB, UFW rules |
| `deploy/deploy.sh` | Per-deploy script: `git pull` → `npm ci` → `prisma migrate deploy` → `pm2 reload` |
| `deploy/backup.sh` | Nightly `pg_dump` → gzip, 14-day retention; GCS upload block is commented out |
| `.github/workflows/deploy.yml` | GitHub Actions: SSH into VM on push to `main`, run `deploy.sh` |

**`package.json` new scripts:**
```
migrate:deploy   prisma migrate deploy
pm2:start        pm2 start ecosystem.config.cjs
pm2:reload       pm2 reload ecosystem.config.cjs
pm2:logs         pm2 logs iem-bsh-api
```

### Phase 4 — Housekeeping

- `scripts/verify-data.js` — moved from project root; `dotenv.config` path updated to `../env` (commit `348c3bf`)
- `.gitignore` updated: removed `.vercel/`, added `/uploads/`
- `.env.example` refreshed with `NODE_ENV`, `UPLOAD_DIR`, local Postgres as default, VM/pgbouncer as commented option
- `README.md` fully rewritten: GCP VM architecture diagram, first-time setup, GitHub secrets table, log/backup sections, updated service dependencies

---

## Deviations from the Original Plan

| Plan item | What actually happened |
|---|---|
| `ecosystem.config.js` | Created as `ecosystem.config.cjs` — PM2 uses `require()` to load it and ESM `"type":"module"` would break that |
| `appleboy/ssh-action` (unversioned) | Pinned to `appleboy/ssh-action@v1.2.0` |
| `setup-vm.sh` — NodeSource `curl \| bash` | Replaced with apt signing key + deb source approach to pass semgrep CWE-95 check |
| Plan used placeholder domain | Updated to `bshs-api.iem.edu.in` in all files |
| `deploy.sh` — `prisma migrate deploy` only | Added fallback to `prisma db push` when no `migrations/` dir exists yet |
| Added `merge_logs: true` and `max_memory_restart: '500M'` to PM2 config | Not in original plan; added for production robustness |

---

## What's Left (VM Provisioning — manual steps)

The repo is fully ready. The remaining work is ops:

### 1. Provision the VM
- GCP Console → Compute Engine → Create instance
- Machine type: `g1-small` (can scale to `e2-small` if needed)
- OS: Ubuntu 24.04 LTS
- Reserve a **static external IP**
- Firewall: allow HTTP (80) and HTTPS (443)

### 2. DNS
Request the `iem.edu.in` zone admin to add:
```
bshs-api.iem.edu.in.   A   <VM_STATIC_IP>
```
Wait for `dig bshs-api.iem.edu.in` to resolve before continuing — Caddy needs this for Let's Encrypt TLS issuance.

### 3. Bootstrap the VM
```bash
ssh <your-user>@<vm-ip>
sudo bash /path/to/deploy/setup-vm.sh   # or clone first, then run
```

### 4. Create production `.env`
```bash
sudo -u deploy nano /var/www/iem-bsh/.env
```
Required values:
```
PORT=6500
NODE_ENV=production
UPLOAD_DIR=/var/www/iem-bsh/uploads
DATABASE_URL="postgresql://iem_bsh:<generated-password>@localhost:5432/iem_bsh"
DIRECT_URL="postgresql://iem_bsh:<generated-password>@localhost:5432/iem_bsh"
JWT_SECRET=<long-random-string>
CORS_ORIGINS=https://your-frontend.vercel.app
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<secure-password>
EMAIL_USER=...
EMAIL_PASS=...
ADMIN_EMAIL=...
```
> The generated DB password is printed by `setup-vm.sh` during bootstrap — copy it before the session ends.

### 5. First deploy
```bash
sudo -u deploy bash /var/www/iem-bsh/deploy/deploy.sh
pm2 save   # persist process list so it survives reboots
```

### 6. Verify
```bash
curl https://bshs-api.iem.edu.in/api/batch/essential
```
Should return JSON with a valid TLS cert issued by Let's Encrypt.

### 7. Add GitHub Actions secrets
In the repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `VM_HOST` | Static external IP of the VM |
| `VM_USER` | `deploy` |
| `VM_SSH_KEY` | Private key matching the public key added to `/home/deploy/.ssh/authorized_keys` |
| `VM_SSH_PORT` | `22` (optional, only if non-standard) |

### 8. Schedule nightly backups
```bash
sudo crontab -e
# Add:
0 2 * * *  /var/www/iem-bsh/deploy/backup.sh >> /var/log/iem-bsh/backup.log 2>&1
```

---

## Optional Follow-ups

| Item | Notes |
|---|---|
| Switch to Prisma migrations | Run `npx prisma migrate dev --name init` locally to snapshot the current schema into `prisma/migrations/`. Then `prisma migrate deploy` on the VM. Gives a reversible change history. Currently `deploy.sh` falls back to `db push` if no `migrations/` dir exists. |
| GCS backups | Uncomment the `gsutil cp` block in `deploy/backup.sh` after provisioning a GCS bucket and service account on GCP. |
| Upgrade VM | g1-small (1 vCPU/1.7 GB RAM) is sufficient for low traffic. Resize to e2-small if response times degrade under load — no code changes needed. |
| Frontend upload URL | If the frontend hardcodes `puppeteer_assets/` in image URLs, update those references to `/uploads/`. |
