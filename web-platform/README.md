# AfyaSolar

AfyaSolar is a [Next.js](https://nextjs.org) web platform for healthcare-facility solar energy services in Tanzania. It supports facility onboarding, solar package subscriptions (cash, installment, and energy-as-a-service), energy monitoring, microgrid billing, maintenance workflows, payments, and admin operations.

**Repository:** [github.com/ubuntuafyalink/afyasolar](https://github.com/ubuntuafyalink/afyasolar)

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 18, Tailwind CSS 4, Radix UI |
| Auth | NextAuth.js |
| Database | MySQL (via Drizzle ORM) |
| Optional | Cloudinary (uploads), SMTP (email), Twilio (WhatsApp), web push |

## Prerequisites

Before you install, make sure you have:

- **Node.js** 18.18 or newer (20 LTS recommended)
- **npm** 9+ (comes with Node)
- **MySQL** 8.x (local install, Docker, or a hosted instance such as TiDB Cloud)
- Git

## Quick start

### 1. Clone and install dependencies

This repository is a monorepo. The web platform lives in `web-platform/`, and
there is no package manifest at the root, so install from inside that directory.

```bash
git clone https://github.com/ubuntuafyalink/afyasolar.git
cd afyasolar/web-platform
npm install
```

Every command below runs from `web-platform/`.

### 2. Configure environment variables

Copy the example file and edit it with your values:

```bash
cp .env.example .env
```

At minimum for local development you need database and auth settings. See [Environment variables](#environment-variables) below.

For a typical **local MySQL** setup, also set:

```env
DB_SSL=false
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

Generate a secure `NEXTAUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create the database

Create an empty MySQL database matching `DB_NAME` in your `.env` (default: `afya_solar`):

```sql
CREATE DATABASE afya_solar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run migrations

Apply schema migrations to your database:

```bash
npm run db:migrate
```

Optional helpers (run when you need those features):

```bash
npm run db:ensure-efficiency-climate   # efficiency / climate tables
npm run db:create-assessment-report-tables
```

### 5. Create an admin user

Create your first admin account (interactive prompts):

```bash
npm run create-admin
```

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in at `/auth/signin` with the admin user you created.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DB_HOST` | Yes | MySQL host |
| `DB_PORT` | Yes | MySQL port (e.g. `3306`) |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | Database name |
| `DB_SSL` | No | Set to `false` for local MySQL; `true` for hosted DB with SSL |
| `DB_CA_PATH` | No | Path to CA cert when using SSL |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption |
| `NEXTAUTH_URL` | Yes | App URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL (same as above in dev) |
| `CLOUDINARY_CLOUD_NAME` | Yes* | Cloudinary cloud name (file uploads) |
| `CLOUDINARY_API_KEY` | Yes* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes* | Cloudinary API secret |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | No | Outbound email |
| `AI_SERVICE_URL` | Yes | Where the FastAPI service in `ai-service/` is reachable **from this server**. Every AI surface proxies through it. Defaults to `http://localhost:8000`, so a wrong value fails silently against loopback rather than reporting a missing setting. |
| `APP_BASE_URL` | No | Absolute base URL used in outbound links; falls back to `NEXT_PUBLIC_APP_URL` |
| `NODE_ENV` | No | `development` or `production` |

### Payments

The payment rail is AzamPay. Subscriptions and microgrid billing do not work without it.

| Variable | Required | Description |
| --- | --- | --- |
| `AZAM_PAY_CLIENT_ID` | For payments | AzamPay client id |
| `AZAM_PAY_CLIENT_SECRET` | For payments | AzamPay client secret |
| `AZAM_PAY_API_KEY` | For payments | AzamPay API key |
| `AZAM_PAY_APP_NAME` | For payments | Registered application name |
| `AZAM_PAY_ENVIRONMENT` | For payments | `sandbox` or `production` |

### Messaging

| Variable | Required | Description |
| --- | --- | --- |
| `SMS_PROVIDER` | No | Selects the SMS adapter; leave unset for the default |
| `SMARTSMS_API_KEY` | No | SMS via SmartSMS |
| `SMARTSMS_API_URL` | No | SmartSMS endpoint override |
| `SMARTSMS_SENDER_ID` | No | Registered SMS sender id |
| `AFRICASTALKING_USERNAME` | No | Africa's Talking username |
| `AFRICASTALKING_API_KEY` | No | Africa's Talking API key |
| `AFRICASTALKING_SENDER_ID` | No | Africa's Talking sender id |
| `TWILIO_ACCOUNT_SID` | No | WhatsApp notifications |
| `TWILIO_AUTH_TOKEN` | No | WhatsApp notifications |
| `TWILIO_WHATSAPP_NUMBER` | No | Sending WhatsApp number |

### Push notifications

| Variable | Required | Description |
| --- | --- | --- |
| `VAPID_PRIVATE_KEY` | No | Web push private key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | No | Web push public key, read by the browser |
| `VAPID_SUBJECT` | No | Contact URI for the push service, e.g. `mailto:…` |

### Machine access and integrations

| Variable | Required | Description |
| --- | --- | --- |
| `DEVICE_INGEST_TOKEN` | For telemetry | Bearer token gateways present to `POST /api/devices/telemetry` |
| `CRON_SECRET` | For scheduled jobs | Bearer token required by the scheduled endpoints |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob storage for generated reports |
| `GEMINI_API_KEY` | No | Preferred assistant model |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.0-flash` |
| `GROQ_API_KEY` | No | Assistant fallback when Gemini is unset |
| `OPENAI_API_KEY` | No | Optional alternative assistant provider |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Climate Outlook map; falls back to OpenStreetMap when unset |
| `NEXT_PUBLIC_DEMO_TELEMETRY` | No | Renders demo telemetry on power surfaces |

\*Required at runtime when features that upload media are used.

Full variable names and placeholders are in [`.env.example`](.env.example). Runtime validation lives in [`src/lib/env.ts`](src/lib/env.ts).

## NPM scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start dev server (webpack) |
| `npm run build` | Production build |
| `npm run start` | Run production server (after `build`) |
| `npm run lint` | ESLint (`eslint src`) |
| `npm run type-check` | TypeScript check without emit |
| `npm run db:migrate` | Run database migrations |
| `npm run create-admin` | Create an admin user |
| `npm run db:seed` | Seed data (if configured) |
| `npm run generate-vapid-keys` | Generate keys for web push notifications |

## Main routes

| Path | Who it's for |
| --- | --- |
| `/` | Landing; redirects signed-in users by role |
| `/auth/signin`, `/auth/signup` | Authentication |
| `/dashboard/admin` | Platform administrators |
| `/dashboard/facility` | Healthcare facility users |
| `/dashboard/technician` | Field technicians |
| `/dashboard/management-panel` | Internal management |
| `/services/afya-solar` | Afya Solar service entry |
| `/demo/[token]`, `/demo/facility/[token]`, `/demo/microgrid/[token]` | Token-based demo dashboards |

Demo tokens and seed facility data are defined in [`src/lib/facility-data.ts`](src/lib/facility-data.ts). See [`docs/DEMO_ACCESS_GUIDE.md`](docs/DEMO_ACCESS_GUIDE.md) for details.

## Production build

```bash
npm run build
npm run start
```

Set `NODE_ENV=production` and use your production URLs for `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`. Ensure the database is migrated and SSL settings match your host.

## Project structure

```text
src/
  app/          # Next.js App Router pages and API routes
  components/   # Shared UI components
  hooks/        # React hooks
  lib/          # Auth, database, payments, notifications, business logic
docs/           # Platform, architecture, and feature documentation
public/         # Static assets and PWA service worker files
scripts/        # One-off maintenance scripts
```

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/AFYASOLAR_PLATFORM_DOCUMENTATION.md`](docs/AFYASOLAR_PLATFORM_DOCUMENTATION.md) | Platform overview, roles, and schema reference |
| [`../docs/architecture/`](../docs/architecture/) | Layered system architecture figure |
| [`docs/DEMO_ACCESS_GUIDE.md`](docs/DEMO_ACCESS_GUIDE.md) | Demo dashboards and tokens |
| [`docs/FEATURE_MATRIX.md`](docs/FEATURE_MATRIX.md) | Feature coverage |
| [`docs/CARBON_CALCULATOR_METHODOLOGY.md`](docs/CARBON_CALCULATOR_METHODOLOGY.md) | Carbon credit calculations |
| [`docs/INTEGRATION_SEAMS.md`](docs/INTEGRATION_SEAMS.md) | Extension points (device ingestion, messaging, forecast, open data) and how deferred hardware/ML work plugs in |

## Troubleshooting

**Build succeeds but the app crashes on start**  
Check the terminal for `Missing required environment variable`. Fill in every required key in `.env`.

**Cannot connect to MySQL**  
Verify `DB_HOST`, `DB_PORT`, credentials, and that the database exists. For local MySQL, set `DB_SSL=false`.

**NextAuth redirect or session errors**  
`NEXTAUTH_URL` must exactly match the URL you use in the browser (including `http` vs `https`).

**Upload or image features fail**  
Add valid `CLOUDINARY_*` variables to `.env`.

## License

**MIT License** — see [`LICENSE`](../LICENSE) at the repository root (it covers both
`web-platform/` and `ai-service/`).

AfyaSolar Intelligence is developed by **Ubuntu Afyalink Company Limited** and is being
open-sourced as part of the UNICEF Venture Fund (Climate) engagement,
RFPS-NYH-2026-503931. Consistent with the Venture Fund requirements, the **entire funded
solution is open source** — all application code, the CRiPHC/RCS resilience-scoring engine,
the climate and carbon modules, the messaging templates, the open-data API, the database
schema, and (as they are built) the machine-learning training/inference code **and their
trained scoring weights**. Nothing in the funded solution is withheld.

The sustainable business is the running managed service, the live operational data, the
deployed install base, and the institutional relationships — none of which are funded code,
and none of which conflict with a fully open codebase.

- **Reviewers / UNICEF Innovation:** the repository owner will grant direct repository access
  (invite `@unicefinnovation`) rather than sharing a video walkthrough.
- **Digital Public Good:** this project intends to register with, and meet the standard of,
  the [DPG Registry](https://digitalpublicgoods.net/).

See [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`GOVERNANCE.md`](../GOVERNANCE.md),
[`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md), and [`SECURITY.md`](../SECURITY.md) for how to
participate and report issues.
