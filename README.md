# IEM BSH Backend API

Node.js/Express REST API for the IEM BSH Department website, deployed on Vercel with a PostgreSQL database via Supabase and Prisma ORM.

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Email**: Nodemailer (Gmail SMTP)
- **File Upload**: Multer
- **Deployment**: Vercel (serverless)

## Project Structure

```
backend-node/
├── api/
│   └── index.js          # Vercel serverless entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.js           # Database seeder
├── src/
│   └── server.js         # Express app + all routes
├── vercel.json           # Vercel rewrite config
└── package.json
```

## Environment Variables

Create a `.env` file in the `backend-node/` directory with the following:

```env
# Server
PORT=5000

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Admin credentials (used during seeding)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# CORS — comma-separated origins, or * to allow all
CORS_ORIGINS=https://your-frontend.vercel.app

# Database (Supabase PostgreSQL)
# Use the pooled connection URL for runtime queries (pgbouncer)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
# Use the direct connection URL for Prisma migrations/schema push
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

# Email (Gmail SMTP — use an App Password, not your account password)
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

The API will be available at `http://localhost:5000`.

## Build & Deployment (Vercel)

This project is configured for Vercel serverless deployment. All requests are rewritten to `api/index.js` via `vercel.json`.

```bash
# Deploy via Vercel CLI
vercel --prod
```

Or connect the `backend-node/` directory to a Vercel project and set the environment variables in the Vercel dashboard. No build command is required — Vercel runs `npm install` which triggers `prisma generate` via the `postinstall` script.

### Required Vercel Environment Variables

Set all variables from the `.env` section above in your Vercel project settings. The `VERCEL=1` env var is set automatically by Vercel and disables the `app.listen()` call.

## Database

- Provider: **PostgreSQL** via [Supabase](https://supabase.com)
- ORM: **Prisma**
- Use `DATABASE_URL` (pooled, port 6543) for runtime and `DIRECT_URL` (direct, port 5432) for migrations

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
| Supabase PostgreSQL | Primary database |
| Gmail SMTP | Login alerts and password change notifications |
| Vercel | Hosting / serverless deployment |
