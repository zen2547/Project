# ReelRate API

A movie catalogue and review REST API, inspired by IMDb movie pages. Admins manage movies through CRUD, Guests browse them, and Members post Reviews (a 1–10 Score plus an optional Comment) and keep a Watchlist.

## Highlights

- **Role-based auth**: JWT + argon2, with global `AuthGuard` and `RoleGuard` (Guest / Member / Admin)
- **Validated at the edge**: Zod schemas for request bodies and env config (the app refuses to boot on bad config)
- **Real-database e2e tests**: Vitest + supertest against a separate `*_test` Postgres, with a guard that refuses to wipe any other DB
- **Spec-driven**: every module has a spec with success criteria, and a glossary keeps names consistent

- What we're building: [CAPABILITY-MAP.md](./CAPABILITY-MAP.md) and the `SPEC-*.md` files
- Words we use: [GLOSSARY.md](./GLOSSARY.md)
- Build progress: [tasks/todo.md](./tasks/todo.md)

## Stack

NestJS 12 (Express) · Prisma 7 · PostgreSQL · Zod · Vitest · pnpm

## Getting started

Needs a local PostgreSQL (tested on 18) running on `localhost:5432`.

```bash
pnpm install
cp .env.example .env      # then put your Postgres password in both URLs

# one-time: create the two databases
psql -U postgres -c "CREATE DATABASE imdb_dev"
psql -U postgres -c "CREATE DATABASE imdb_test"

pnpm prisma migrate dev   # apply migrations to imdb_dev
pnpm prisma db seed       # create the Admin from ADMIN_* in .env (safe to re-run)
pnpm start:dev            # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm start:dev` | Run with watch mode |
| `pnpm build` | Compile to `dist/` |
| `pnpm lint` | oxlint with type-aware rules |
| `pnpm test` | Unit tests (`src/**/*.spec.ts`) |
| `pnpm format` | Prettier |
| `pnpm prisma migrate dev` | Create/apply migrations on `imdb_dev` |
| `pnpm prisma db seed` | Upsert the Admin from `.env` (more mock data in later tasks) |
| `pnpm test:e2e` | E2E tests against `imdb_test` (refuses any DB not named `*_test`) |
| `pnpm prisma generate` | Regenerate the Prisma client into `src/prisma/generated` |
