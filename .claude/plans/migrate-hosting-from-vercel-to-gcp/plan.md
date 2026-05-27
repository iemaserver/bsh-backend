# Migrate hosting from Vercel + Supabase → GCP Compute Engine VM

## Context

The repo is currently structured for **Vercel serverless** deploys with **Supabase PostgreSQL**. We want to move to a **single GCP Compute Engine VM** that runs both the Node.js API and PostgreSQL on the same box. This shift unlocks:

- True long-lived process semantics (no cold starts, no 10s execution caps, no read-only FS)
- Multer disk uploads actually work — currently `src/server.js:747` writes to `../puppeteer_assets`, which silently failed on Vercel's read-only FS
- One bill, one place to debug, no per-invocation pricing surprises
- Direct DB connections without the pgbouncer/pooled split

Previous session already removed Supabase framing and switched local dev to Homebrew Postgres. The Vercel layer is the remaining piece.

**Chosen stack (per user input):**
- GCP Compute Engine VM, Ubuntu 22.04 LTS (e2-small recommended; scale to e2-medium if needed)
- PostgreSQL 16 on the **same VM**
- **Caddy** as reverse proxy with automatic Let's Encrypt HTTPS
- **PM2** process manager
- **GitHub Actions SSH deploy** triggered on push to `main`
- Backend-only on the VM (frontend stays on Vercel); Caddy serves `bshs-api.iem.edu.in`

---

## Architecture

```
Internet
   │ HTTPS (443)
   ▼
┌────────────────────────────────────────────────┐
│   GCP Compute Engine VM (Ubuntu 22.04)         │
│                                                │
│   Caddy (:443, :80)  ── auto Let's Encrypt     │
│      │                                         │
│      ▼ reverse_proxy localhost:6500            │
│   Node.js / Express (pm2-managed, :6500)       │
│      │                                         │
│      ├─► PostgreSQL 16 (localhost:5432)        │
│      └─► /var/www/iem-bsh/uploads/             │
│                                                │
│   systemd: caddy.service, postgresql.service   │
│   pm2 (started via systemd unit on boot)       │
└────────────────────────────────────────────────┘
        ▲
        │ SSH (22, IP-allowlisted)
        │
   GitHub Actions (deploy.yml) ── on push to main
```

GCP firewall: allow 22 (from GitHub Actions runner IPs or your office IP), 80, 443. Block direct access to 5432 and 6500.

---

## Repo changes

### 1. Delete Vercel artifacts
- `vercel.json` — delete
- `api/index.js` — delete (and the `api/` directory if empty)

### 2. `src/server.js` edits
- **Line 985-987**: remove `if (process.env.VERCEL !== '1')` guard so `app.listen()` always runs
- **Line 747**: replace hardcoded `path.join(process.cwd(), '../puppeteer_assets')` with `process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')`. This makes the path configurable so the VM can point at `/var/www/iem-bsh/uploads` while local dev uses a project-relative folder.
- Add `app.use('/uploads', express.static(uploadDir))` if uploads need to be served directly (check current behavior first — they may already be served from a CDN/imageUrl pattern)

### 3. New file: `ecosystem.config.js` (PM2 config)
```js
export default {
  apps: [{
    name: 'iem-bsh-api',
    script: 'src/server.js',
    instances: 1,           // bump to 'max' for cluster mode once vetted
    exec_mode: 'fork',
    env: { NODE_ENV: 'production' },
    error_file: '/var/log/iem-bsh/error.log',
    out_file:   '/var/log/iem-bsh/out.log',
    time: true,
  }]
}
```

### 4. New file: `deploy/Caddyfile`
```
bshs-api.iem.edu.in {
    reverse_proxy localhost:6500
    encode gzip
    log {
        output file /var/log/caddy/api.log
    }
}
```
> Note: HTTPS issuance requires the `bshs-api.iem.edu.in` A record to resolve to the VM's static IP *before* Caddy starts. Coordinate the DNS change with the `iem.edu.in` zone admin ahead of cutover.

### 5. New file: `deploy/setup-vm.sh`
One-shot bootstrap (idempotent). Installs Node 20, PostgreSQL 16, Caddy, PM2; creates the `iem_bsh` DB and a non-root deploy user; creates `/var/www/iem-bsh` and `/var/log/iem-bsh`; sets up the systemd unit that auto-resurrects pm2 on boot (`pm2 startup systemd`).

### 6. New file: `deploy/deploy.sh`
Runs on the VM each deploy: `git pull`, `npm ci --omit=dev`, `npx prisma migrate deploy`, `pm2 reload ecosystem.config.js`. Idempotent and safe to re-run.

### 7. New file: `.github/workflows/deploy.yml`
- Triggers on push to `main`
- Uses `appleboy/ssh-action` to SSH in and run `deploy/deploy.sh`
- Required repo secrets: `VM_HOST`, `VM_USER`, `VM_SSH_KEY` (private key matching one in the deploy user's `~/.ssh/authorized_keys`)

### 8. `package.json` script additions
- `"pm2:start": "pm2 start ecosystem.config.js"`
- `"pm2:reload": "pm2 reload ecosystem.config.js"`
- `"pm2:logs": "pm2 logs iem-bsh-api"`
- `"migrate:deploy": "prisma migrate deploy"`

Also recommend switching `db:push` workflow to proper Prisma migrations (`prisma migrate dev` locally → `prisma migrate deploy` on the VM). The schema is stable enough; migrations give us reversibility and a clear changelog. This is a soft recommendation, not a hard requirement — `db:push` still works on a VM.

### 9. `.env.example` additions
```
# Path where multer writes uploads (absolute on VM, relative locally)
UPLOAD_DIR=./uploads
NODE_ENV=development
```
Update the production note to point at the GCP VM context rather than Vercel.

### 10. `README.md` rewrite of deploy section
Replace the **Build & Deployment (Vercel)** section with a **Deployment (GCP VM)** section covering:
- Architecture diagram (above)
- First-time VM setup (`bash setup-vm.sh`, point DNS A record at the static IP)
- Required GitHub repo secrets
- Ongoing deploys (just push to main)
- Manual deploy fallback (`ssh + deploy.sh`)
- Backup strategy (nightly `pg_dump` via cron — sample script in `deploy/`)
- Log locations (`pm2 logs`, `journalctl -u caddy`, `/var/log/postgresql/`)

Also update the **Service Dependencies** table: drop Vercel, add "GCP Compute Engine" and "Caddy".

---

## Files modified vs. created

**Modified (4):**
- `src/server.js` — remove VERCEL guard, parameterize upload dir
- `package.json` — add pm2 / migrate scripts
- `.env.example` — add UPLOAD_DIR, NODE_ENV; refresh production notes
- `README.md` — replace deployment section

**Deleted (2):**
- `vercel.json`
- `api/index.js`

**Created (5):**
- `ecosystem.config.js`
- `deploy/Caddyfile`
- `deploy/setup-vm.sh`
- `deploy/deploy.sh`
- `.github/workflows/deploy.yml`

---

## Verification

**Local (unchanged):**
1. `npm run dev` → server listens on `:6500`, no Vercel references in logs
2. POST a file to `/api/admin/upload` → file appears in `./uploads/`

**On the VM (first-time):**
1. Provision e2-small VM, reserve static external IP, request DNS A record for `bshs-api.iem.edu.in` → VM static IP (via the `iem.edu.in` zone admin)
2. SSH in, clone repo, `bash deploy/setup-vm.sh`
3. Copy production `.env` into the project dir, `npx prisma migrate deploy`, `pm2 start ecosystem.config.js`, `pm2 save`
4. `systemctl reload caddy`
5. `curl https://bshs-api.iem.edu.in/api/batch/essential` → returns JSON, valid TLS cert (Caddy issued via Let's Encrypt)

**CI/CD:**
1. Push a trivial change to `main`
2. Watch GitHub Actions run succeed
3. SSH in: `pm2 status` shows `iem-bsh-api` online with a recent uptime
4. `pm2 logs --lines 50` shows clean startup, no errors

**Backups (smoke test):**
1. Run the backup script manually once: `bash deploy/backup.sh`
2. Verify a `.sql.gz` lands in the configured destination (local dir initially; can graduate to a GCS bucket later)
