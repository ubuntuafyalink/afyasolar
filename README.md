# AfyaSolar Intelligence

**AfyaSolar Intelligence** is an open-source decision-intelligence platform that turns facility, energy, and climate data into actionable insights for protecting children's health services in Tanzania. It computes a composite **Resilience Capacity Score (RCS)** across five dimensions, identifies critical service risks, and ranks adaptation actions for healthcare facilities.

**Key Features:**
- Real-time energy monitoring and solar performance tracking
- Climate resilience scoring and risk prediction
- Facility onboarding and subscription management
- Microgrid billing and payment processing
- AI-assisted insights and recommendations
- Role-based dashboards (admin, facility, technician, management)

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

```bash
git clone https://github.com/ubuntuafyalink/afyasolar.git
cd afyasolar
npm install
```

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
| `SMARTSMS_API_KEY` | No | SMS via SmartSMS |
| `TWILIO_*` | No | WhatsApp notifications |
| `GROQ_API_KEY` | No | AI-assisted features |

\*Required at runtime when features that upload media are used. Add them to `.env` even if they are not listed in `.env.example`.

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

| Document | Purpose |
| --- | --- |
| [`TECH_STACK.md`](TECH_STACK.md) | **Start here.** Technology choices, engineering standards, and architectural decisions (canonical for all contributors). |
| [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) | What we're building: problem statement, solution design, and feature roadmap. |
| [`FRONTEND_DESIGN_GUIDE.md`](FRONTEND_DESIGN_GUIDE.md) | UI/UX tooling and design practices (ui-ux-pro-max, Magic, Framer Motion). |
| [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md) | v2 implementation phases and priorities. |
| [`docs/AFYASOLAR_PLATFORM_DOCUMENTATION.md`](docs/AFYASOLAR_PLATFORM_DOCUMENTATION.md) | Platform overview, roles, and database schema reference. |
| [`docs/SIMPLIFIED_SYSTEM_ARCHITECTURE.md`](docs/SIMPLIFIED_SYSTEM_ARCHITECTURE.md) | High-level system architecture. |
| [`docs/DEMO_ACCESS_GUIDE.md`](docs/DEMO_ACCESS_GUIDE.md) | Demo dashboards and token-based access. |
| [`docs/CLIMATE_RESILIENCE_METHODOLOGY.md`](docs/CLIMATE_RESILIENCE_METHODOLOGY.md) | RCS scoring methodology and climate data integration. |
| [`docs/CARBON_CALCULATOR_METHODOLOGY.md`](docs/CARBON_CALCULATOR_METHODOLOGY.md) | Carbon credit calculations and verification. |

## Contributing

**Before writing code,** read:
1. [`TECH_STACK.md`](TECH_STACK.md) — technology choices and standards you must follow
2. [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) — what you're building and why
3. [`FRONTEND_DESIGN_GUIDE.md`](FRONTEND_DESIGN_GUIDE.md) — if doing UI/UX work

**Making changes?**
- Follow the canonical stack (Next.js 16, TypeScript strict, Tailwind CSS 4, Drizzle ORM)
- All decision path code (scoring, risk ranking, recommendations) must be deterministic and auditable
- Type safety is mandatory (`ignoreBuildErrors` must be removed on merge)
- Document changes with ADRs for architecture decisions
- Test with `/code-review` or `/verify` before committing

## Troubleshooting

| Problem | Solution |
| --- | --- |
| **App crashes on start** | Check terminal for `Missing required environment variable`. Fill in all required keys in `.env`. |
| **Cannot connect to MySQL** | Verify `DB_HOST`, `DB_PORT`, credentials, and database existence. Set `DB_SSL=false` for local MySQL. |
| **NextAuth redirect errors** | `NEXTAUTH_URL` must exactly match your browser URL (including `http` vs `https`). |
| **Upload/image features fail** | Add valid `CLOUDINARY_*` variables to `.env`. |
| **Build fails while dev is running** | Never run `npm run build` while `next dev` is up (they share `.next/`). Use `tsc` or `eslint` instead. |

## Development Workflow

```bash
# Start dev server
npm run dev

# Type-check without emitting
npm run type-check

# Lint code
npm run lint

# Run unit tests
npm run test

# Run end-to-end tests
npm run test:e2e

# Database: run migrations
npm run db:migrate

# Database: optional setup
npm run db:ensure-efficiency-climate
npm run db:ensure-admin
```

## License

Open-source (MIT) — see repository for full license terms. Built for and with healthcare facilities in Tanzania.
