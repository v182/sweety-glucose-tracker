# Sweety

A responsive blood glucose journal for the Kenpath **Junior Full Stack Developer – JavaScript & AI** assignment. React, Express and PostgreSQL power the application. Record up to four readings a day and review daily, month-to-date and previous-month reports.

## Features

- Register, log in, restore a session and log out; bcrypt password hashing.
- Add, view, edit and delete your own readings with clear field and server errors.
- Four slots; integer values **40–600 mg/dl**, inclusive; no future dates.
- Duplicate-slot/capacity checks backed by SQL constraints and transactions.
- Reports with highest, lowest, one-decimal average and count; friendly empty states.
- Responsive dashboard, history filters, pagination, charts and confirmation dialogs.
- Bonuses: paginated API, Recharts, Docker Compose and React Testing Library tests.

## Requirements

Node.js **22.12+**, npm and PostgreSQL **16+**, or Docker with Compose v2. The frontend and API share one origin; no separate client server or CORS configuration is needed.

## Option A: run everything with Docker

```bash
cp .env.example .env
```

On Windows PowerShell use `Copy-Item .env.example .env`. Edit `.env`: choose local development values for `POSTGRES_PASSWORD` and `DEMO_PASSWORD`. The demo password needs at least 8 characters. Use a URL-safe database password for the Compose connection URL (letters, digits and hyphens work).

```bash
docker compose up --build -d
docker compose exec app npm run db:seed
docker compose logs -f app
```

Open **http://localhost:3000**. Log in with `DEMO_EMAIL` and `DEMO_PASSWORD` from `.env`, or register. Compose waits for PostgreSQL, applies migrations and serves the built React client and Express API together. The database volume survives restarts; `docker compose down` stops services and retains the volume.

Compose is configured for local HTTP, with ports bound only to your machine. For a public deployment provide HTTPS, set `COOKIE_SECURE=true` and `APP_ORIGIN` to the exact HTTPS origin, configure `TRUST_PROXY` only for a trusted proxy, and use private database networking and strong credentials.

## Option B: local development with PostgreSQL

```bash
npm ci
cp .env.example .env
```

Start only the Compose database with `docker compose up -d db`, or use an installed PostgreSQL server. On an installed server run this in `psql` as an administrator, replacing the example password:

```sql
CREATE USER sweety WITH PASSWORD 'choose-a-local-password';
CREATE DATABASE sweety OWNER sweety;
CREATE DATABASE sweety_test OWNER sweety;
```

Set `DATABASE_URL` in `.env` to your application connection string. Keep `SWEETY_LOCAL_DEMO=false`, set your demo credentials, then run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3000**. Express serves `/api`; Vite middleware serves React with hot updates on the same port. Restart `npm run dev` after backend changes. Change `PORT` in `.env` or use `npm run dev -- --port 3001`.

For a production Node host run `npm run build`, apply migrations, set `NODE_ENV=production` and the other production variables, then run `npm start`. This entry point always uses PostgreSQL through `pg`.

## Optional demo without a PostgreSQL service

```bash
npm ci
npm run preview:demo
```

Open **http://localhost:3000** with this synthetic account:

| Field    | Value               |
| -------- | ------------------- |
| Email    | `demo@sweety.local` |
| Password | `SweetyDemo!2026`   |

This explicit development-only mode uses **PGlite**, an embedded PostgreSQL engine, storing synthetic data in ignored `.preview-data`. It exercises the same Express routes and migrations. It is **not the production database** and does not replace verification against a PostgreSQL server. It refuses `NODE_ENV=production`. Setting `SWEETY_LOCAL_DEMO=true` also enables it with `npm run dev`; `npm start` never uses that switch.

The seed creates the current and previous months relative to `APP_TIMEZONE`. Today begins with two readings, leaving two slots to demonstrate additions. All values are fabricated. Re-running the seed leaves an existing account, password and readings untouched.

## Tests

```bash
npm test              # API/date tests + React form tests
npm run build        # production frontend bundle
npm run check        # tests and build
npm run format:check # formatting
```

API tests use isolated in-memory PGlite by default. For a real PostgreSQL server set `TEST_DATABASE_URL` in `.env` to a separate database ending in `_test`:

```dotenv
TEST_DATABASE_URL=postgresql://sweety:choose-a-local-password@localhost:5432/sweety_test
```

For Compose, create this database with `docker compose exec db createdb -U sweety sweety_test` (adjust username if changed). Tests migrate it, create unique synthetic accounts and remove their own rows afterward. Never use a database containing real data.

GitHub Actions is configured to run the same suite against **PostgreSQL 16**, then build the client after a push. Results and remaining checks are recorded in [docs/VERIFICATION.md](docs/VERIFICATION.md); unrun Docker/CI jobs are not claimed as passing.

Coverage includes bcrypt, revocation, user isolation, CSRF/origin checks, validation, concurrent duplicates, edits on full days, collision rollback, SQL constraints, pagination, leap-year/January boundaries, empty reports, seed repeatability, and form errors/editing/pending requests.

## Reports

Ranges are inclusive. For selected date **15 October 2026**:

| Report                               | Range               |
| ------------------------------------ | ------------------- |
| Daily                                | 15 October 2026     |
| Month to date                        | 1–15 October 2026   |
| Previous month (`monthly` API value) | 1–30 September 2026 |

Empty reports return null glucose aggregates and count zero. The UI displays `—` for missing values and one decimal for averages. Daily reports list each reading and slot. Charts separate the four slot series and leave gaps for missing readings.

## Structure

| Path                     | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| `client/src/pages/`      | Authentication, dashboard, history, reports      |
| `client/src/components/` | Forms, dialogs, tables, summary cards, chart     |
| `server/src/routes/`     | Auth, CRUD, reports                              |
| `server/src/security.js` | Sessions, CSRF and origin checks                 |
| `server/src/db/`         | PostgreSQL adapter, migrations, seed             |
| `shared/`                | Dates, slots and reading validation              |
| `server/test/`           | Integration and date tests                       |
| `scripts/`               | Development entry and embedded demo/test adapter |

See [API reference](docs/API.md), [implementation walkthrough](docs/IMPLEMENTATION.md), [demo script](docs/DEMO.md), and [requirements](docs/REQUIREMENTS.md).

## Notes

**Assumptions**

- PostgreSQL is required; the assignment’s “MERN” heading does not require MongoDB too.
- Everyone shares `APP_TIMEZONE`, default `Asia/Kolkata`. Readings are calendar DATEs. Future-date validation uses the server zone; the UI refreshes today on focus and each minute.
- Monthly means the entire month before the **selected date’s month**.
- Four allowed slots plus a unique user/date/slot constraint enforce the daily maximum. A per-user row lock serializes writes for clear errors. Capacity errors take precedence on a full day; value-only edits still work.
- The API accepts JSON numbers, not numeric strings. The form converts valid whole-number text before sending.
- Opaque database sessions use HttpOnly, SameSite cookies and CSRF tokens. Logout revokes the current session. No browser-stored JWTs are needed.
- Emails are normalized; email verification and password reset are outside scope. Passwords require 8 characters and respect bcrypt’s 72-byte maximum.
- This app records measurements; it does not classify values or offer treatment advice.

**With more time**

- Verify Docker and PostgreSQL CI on the submission host; add browser end-to-end tests.
- Add per-user time zones, email verification and password reset with expiring tokens.
- Add export, audit history and a chart-adjacent accessible data table toggle.
- Add scheduled expired-session cleanup and a shared rate-limit store for multiple processes.
- Add backup/restore and monitoring for deployment. Redis, BullMQ and doctor roles were left out to keep the assignment focused.

**Development assistance**

Developed with AI coding assistance. The candidate should run it locally, review the code and tests, and be ready to explain and modify the implementation in an interview. Commits record actual development stages and have not been backdated.
