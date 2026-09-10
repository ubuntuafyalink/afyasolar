# Deployment

How to run AfyaSolar Intelligence outside a developer laptop. The stack is two
services plus a database, and the two services talk over HTTP.

```
  browser  ──▶  web-platform (Next.js, :3000)  ──▶  ai-service (FastAPI, :7860)
                        │
                        ▼
                    MySQL 8
```

## Fastest path: Docker Compose

```bash
git clone https://github.com/ubuntuafyalink/afyasolar.git
cd afyasolar
cp web-platform/.env.example .env

# Set at least NEXTAUTH_SECRET; compose refuses to start without it.
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

docker compose up --build
```

The database starts first and the web container waits for its health check.
Once the stack is up, create the schema and an administrator:

```bash
docker compose run --rm web npm run db:migrate
docker compose run --rm web npm run create-admin
```

Open <http://localhost:3000> and sign in at `/auth/signin`.

`docker-compose.yml` publishes the AI service on host port 8000 for poking at
directly, while the web container reaches it in-network at
`http://ai-service:7860`. Do not change one without the other.

## Resource requirements

| Component | Notes |
|---|---|
| web-platform | Modest. 1 vCPU and 1 GB RAM is enough for a small deployment. |
| ai-service | **Roughly 1.5 GB of model weights** are pulled from Hugging Face on first boot, plus the serving stack. Give it 2 GB of RAM and persistent storage for the cache, or the download repeats on every restart. No GPU is needed to serve; a GPU is only for retraining. |
| MySQL 8 | Standard. Size for telemetry retention, which is the table that grows. |

First start of the AI service is slow because of that download. The compose file
mounts a named volume for the Hugging Face cache so it happens once. The
container's health check allows a two-minute start period for the same reason.

To avoid the runtime download entirely, bake the weights into the image or mount
them and set `AI_ENGINE_MODEL_DIR`. See `ai-service/README.md`.

## Running without containers

Both services run directly. The web platform needs Node 20 and a reachable
MySQL 8; the AI service needs Python 3.11.

```bash
# AI service
cd ai-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-serve.txt      # NOT requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`requirements.txt` is the light set: it boots the API and serves `/health`, but
**cannot forecast**. Serving needs `requirements-serve.txt`. Installing the wrong
one produces a service that starts and then fails every prediction.

```bash
# Web platform
cd web-platform
npm ci
cp .env.example .env        # then edit it
npm run db:migrate
npm run create-admin
npm run build
npm run start
```

Put a reverse proxy in front of the web platform to terminate TLS. The AI
service should **not** be exposed publicly; see Security below.

## Database migrations

Migrations run through a custom runner rather than `drizzle-kit`:

```bash
npm run db:migrate
```

Some features need additional tables that are not part of the main sequence:

```bash
npm run db:ensure-efficiency-climate
npm run db:create-assessment-report-tables
npm run db:ensure-admin
```

Run migrations as a deliberate step before starting a new version, not at
container start. The runner reads `.env`, and an earlier bug had it silently
target the production database from a developer machine, so confirm which
database you are pointing at with `npm run db:whereami` first.

### TLS to a hosted database

Managed MySQL such as TiDB Cloud requires a CA certificate. Set `DB_SSL=true` and
point `DB_CA_PATH` at the bundle. The repository ignores `certs/`, so the file is
not in the clone and must be fetched during provisioning:

```bash
mkdir -p web-platform/certs
curl -fsSL https://letsencrypt.org/certs/isrgrootx1.pem \
  -o web-platform/certs/isgrootx1.pem
```

## Configuration

Every variable is documented in
[`web-platform/README.md`](../web-platform/README.md#environment-variables), with
placeholders in `web-platform/.env.example`.

The one most often missed is **`AI_SERVICE_URL`**. It is the only link between
the two services and defaults to `http://localhost:8000`, so if it is wrong the
web platform quietly calls its own loopback and every AI surface fails rather
than reporting a missing setting.

Note that `src/lib/env.ts` treats an unset `VERCEL` variable as a build phase and
returns defaults instead of throwing. On a self-hosted box that means required
variables are **not** enforced at runtime. Validate your environment before
starting rather than relying on the application to complain.

## Security before you expose anything

- **Keep the AI service off the public internet.** It has no user model, and
  `/advisory` proxies to a paid language model API, so an open instance is an
  open bill. Put it on a private network reachable only by the web platform. In
  the compose file it is published on port 8000 for local convenience; remove
  that mapping for any shared environment.
- **Where you cannot guarantee that**, set `AI_SERVICE_TOKEN` on the service and
  the same value on the web platform. Every endpoint then requires that bearer
  token, except `/` and `/health` so health probes keep working. Generate it
  randomly per environment:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

  Set `AI_SERVICE_ALLOWED_ORIGINS` only if a browser genuinely needs to call the
  service. The web platform reaches it server-to-server, which CORS does not
  govern, so the default of no allowed origins is correct.
- There is still **no rate limiting** on the AI service. The bearer token bounds
  who can call it, not how often.
- Terminate TLS at a reverse proxy in front of the web platform.
- `DEVICE_INGEST_TOKEN` and `CRON_SECRET` are bearer tokens. Generate them
  randomly per environment and rotate them.
- Never commit a real `.env`. The repository ignores it.

## Backups

Back up the MySQL volume. Nothing else holds durable state: the Hugging Face
cache is re-downloadable, and generated reports are regenerable.

```bash
docker compose exec db mysqldump -u root -p"$DB_PASSWORD" "$DB_NAME" > backup.sql
```

## Upgrading

1. Back up the database.
2. Pull the new revision and rebuild images.
3. Run `npm run db:migrate`.
4. Restart the services.

There is no automated rollback. To roll back, restore the database backup and
redeploy the previous image, in that order.
