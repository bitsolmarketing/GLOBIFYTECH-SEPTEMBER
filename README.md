# Globify Tech

An AI-powered education operating system for a real institute: a public marketing site, a student learning platform, an instructor studio, an admin command centre and an employer portal, all backed by one PostgreSQL database.

Built for Globify Tech in Faisalabad, where batches are capped at eighteen students and every course ends with work a graduate can show an employer.

---

## What is in the box

| Surface | Route | Who it is for |
| --- | --- | --- |
| Public site | `/` | Prospective students, search engines, hiring partners |
| Student LMS | `/student` | Enrolled students and alumni |
| Instructor Studio | `/instructor` | Instructors and teaching assistants |
| Admin Command Centre | `/admin` | Staff, scoped by role |
| Employer portal | `/employer` | Hiring partners |
| Mobile API | `/api/v1` | A future mobile app, or partner integrations |

Every page is database-driven. There is no hard-coded marketing copy: the home page, about page, admissions page, privacy policy and terms are all CMS pages built from sections you can edit at `/admin/pages`.

---

## Getting started

You need Node 24 and pnpm 11. PostgreSQL is recommended but not required to start.

```bash
pnpm install
cp .env.example .env          # fill in AUTH_SECRET at minimum
```

### With PostgreSQL

```bash
# point DATABASE_URL at your server, then:
pnpm db:deploy                # apply migrations
pnpm db:seed                  # demo institute: courses, students, invoices…
pnpm dev
```

### Without PostgreSQL or Docker

The project ships an embedded PostgreSQL (PGlite compiled to WebAssembly) so it runs on a laptop with nothing installed:

```bash
pnpm db:dev                   # starts PostgreSQL on 127.0.0.1:5433
```

Then, in a second terminal, point the app at it:

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?pgbouncer=true&connection_limit=1"
```

The `pgbouncer=true` flag matters: the embedded server keeps a single session, so Prisma must not reuse prepared statement names. Use a real PostgreSQL in production.

### With Docker

```bash
docker compose up -d
docker compose exec app pnpm db:deploy
docker compose exec app pnpm db:seed
```

That brings up PostgreSQL, Redis, the application and a background worker.

### Demo logins

After seeding, the console prints them. The password is `Globify2026!` unless you set `SEED_PASSWORD`.

| Role | Email |
| --- | --- |
| Super admin | `superadmin@globifytech.com` |
| Admin | `admin@globifytech.com` |
| Academic manager | `academics@globifytech.com` |
| Admissions | `admissions@globifytech.com` |
| Finance | `finance@globifytech.com` |
| Instructor | `zeeshan@globifytech.com` |
| Student | `ayesha.khalid@example.com` |
| Hiring partner | `hiring@systems.example.com` |

Everything the seed creates is flagged `isTestData`, so you can tell demo records from real ones.

---

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm lint` | ESLint across the repository |
| `pnpm test` | Unit tests |
| `pnpm test:db` | Integration tests (needs `TEST_DATABASE_URL`) |
| `pnpm db:dev` | Embedded PostgreSQL for local work |
| `pnpm db:deploy` | Apply migrations |
| `pnpm db:seed` | Seed the demo institute |
| `pnpm db:studio` | Prisma Studio |
| `pnpm worker` | Background job worker |

---

## How it fits together

- **Next.js App Router** with React server components. Data is loaded on the server; client components are used only where there is interaction.
- **PostgreSQL via Prisma**, around 110 models. Full-text search uses generated `tsvector` columns, so search needs no extra service.
- **Auth.js v5** with JWT sessions carrying roles. `src/proxy.ts` gates each surface at the edge; every mutation re-checks permissions on the server.
- **Fifteen roles and about sixty permissions** in `src/lib/rbac`. The matrix is the single source of truth for navigation, page guards and the AI assistant's tools.
- **Providers behind interfaces** for email, WhatsApp, SMS, storage, payments, live classes and AI. Each has a console or local driver, so the app runs fully without a single third-party key.
- **Background jobs** through BullMQ when `REDIS_URL` is set, and inline otherwise.

Architecture, database and security notes live in [`docs/`](docs/).

---

## Security

- Passwords are bcrypt hashed at cost 12. Accounts lock after ten failed sign-ins.
- Every sensitive action writes an audit entry. `audit_logs` is append-only: a database trigger rejects `UPDATE` and `DELETE` for every role, including administrators.
- Server actions validate input with Zod and check permissions before touching data. Instructors are additionally row-scoped to their own courses and batches.
- Rich text is sanitised on the way in, never on the way out.
- Secrets live in the server environment only. `.env.example` holds placeholders and nothing else.
- AI is permission-aware: the admin assistant can only query what the signed-in user could query, and AI-generated course content is always created unpublished for a human to approve.

Details, including the threat model, are in [`docs/SECURITY.md`](docs/SECURITY.md).

---

## Testing

```bash
pnpm test                     # 122 unit tests
TEST_DATABASE_URL="…" pnpm test:db
```

Unit tests cover the permission matrix, the completion engine, risk scoring, quiz grading, job matching and every validation schema. Integration tests run against a real PostgreSQL and prove unique constraints, cascade deletes, invoice and payment consistency, append-only audit logs and full-text search.

---

## Deploying

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full runbook. In short:

1. Provision PostgreSQL and Redis.
2. Set the environment variables from `.env.example`.
3. `pnpm db:deploy` on release.
4. Run the app and at least one worker.
5. Point a scheduler at `POST /api/internal/cron?task=daily` with `CRON_SECRET`.
6. Schedule `scripts/backup-db.sh` and confirm the heartbeat appears at `/admin/automation`.

---

## Continuous integration

A ready workflow lives at [`docs/ci/github-actions-ci.yml`](docs/ci/github-actions-ci.yml). Copy it to `.github/workflows/ci.yml` to enable it: it runs migrations, the seed, typecheck, lint, the tests and a production build against a real PostgreSQL.

---

## Licence

Proprietary. © Globify Tech.
