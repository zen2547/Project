# Implementation Plan: Movie Reviews API — V1

Source spec: [CAPABILITY-MAP.md](../CAPABILITY-MAP.md) + [SPEC-identity.md](../SPEC-identity.md), [SPEC-catalogue.md](../SPEC-catalogue.md), [SPEC-reviews.md](../SPEC-reviews.md), [SPEC-library.md](../SPEC-library.md)

Task details (acceptance criteria, verification, files): [todo.md](./todo.md)

## Overview

Build the V1 backend in `C:\Dev Nest\Imdb-web` as a fresh NestJS 12 + Prisma 7 + Postgres app, porting auth from `dnc03`. Work goes module by module in the map's build order (identity → catalogue → library + reviews), and inside each module as **vertical slices**: every task adds the Prisma models it needs, the migration, the endpoint(s), and the e2e test that proves the spec's success criteria — so the app runs and the tests pass after every task.

## Architecture Decisions

- **Schema grows per slice, not up front.** Each task adds only its own models in its own migration. Keeps each migration small and every task shippable.
- **E2E against a real test database** (separate `imdb_test` database on the same local Postgres). Prisma behaviour such as cascades, unique errors and row locks can't be trusted to mocks. Unit tests with `vi.fn()` cover pure service rules.
- **Library before reviews.** Posting a Review marks the Movie Watched, so `library` must exist first. That turns "reviews, library in parallel" into a short sequence.
- **Risky slice early in its phase:** the Review upsert with row lock and Community Rating recompute (Task 17) is the hardest piece, so it comes first in the reviews phase and has its own concurrency test.
- **Local Postgres for now:** reuse the PostgreSQL 18 server `dnc03` already runs on `localhost:5432`, with its own `imdb_dev` and `imdb_test` databases (never `dnc03`'s `nest_prisma`). `docker-compose.yml` comes later as its own task (see Deferred).
- **Seed grows with the modules:** Admin in Task 6, catalogue data in Task 14, Members and Reviews in Task 20. One `prisma/seed.ts`, re-runnable (it clears tables first).

## Task List

### Phase 1: Foundation
- [x] Task 1: Scaffold the Nest app (builds, lints, one passing test)
- [x] Task 2: Postgres + Prisma + env validation + error filter wired in
- [x] Task 3: E2E test harness against `imdb_test`

### Checkpoint A: Foundation
- [ ] `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` all green
- [ ] Creating `imdb_dev`/`imdb_test` + `pnpm prisma migrate dev` work from a clean clone by following the README

### Phase 2: identity
- [x] Task 4: Member can register
- [x] Task 5: Member can log in and see `/auth/me`
- [x] Task 6: Admin-only routes + seeded Admin

### Checkpoint B: identity
- [x] Every SPEC-identity success criterion has a passing test
- [ ] **Review with Palm** before moving on

### Phase 3: catalogue
- [x] Task 7: Admin manages Genres and Keywords
- [x] Task 8: Admin manages Streaming Services
- [ ] Task 9: Admin creates/edits/deletes a Movie; anyone can view it
- [ ] Task 10: Anyone can browse Movies (search, filter, sort, paginate)
- [ ] Task 11: Admin manages People; anyone can see a filmography
- [ ] Task 12: Admin adds Credits; movie page shows Directors/Writers/Stars

### Checkpoint C: catalogue core
- [ ] All tests green; a Movie with Genres, Keywords and Credits renders from `GET /movies/:id`

- [ ] Task 13: Trailers, Photos and Streaming Links on a Movie
- [ ] Task 14: Seed 12 real Movies with full page data

### Checkpoint D: catalogue complete
- [ ] Every SPEC-catalogue success criterion (except rating sort with real reviews) has a passing test
- [ ] `pnpm prisma db seed` then `GET /movies` → 12 Movies
- [ ] **Review with Palm** before moving on

### Phase 4: library + reviews
- [ ] Task 15: Member keeps a Watchlist
- [ ] Task 16: Member marks Movies Watched
- [ ] Task 17: Member posts/replaces a Review; Community Rating stays correct under concurrency
- [ ] Task 18: Anyone reads Reviews; Member deletes own Review and lists own Reviews
- [ ] Task 19: `GET /me/movies/:movieId` personal state

### Checkpoint E: reviews + library
- [ ] Every SPEC-reviews and SPEC-library success criterion has a passing test

- [ ] Task 20: Seed Members and Reviews; prove `sort=rating` end to end

### Checkpoint F: V1 complete
- [ ] Every success criterion in all four specs maps to a passing test
- [ ] Fresh clone → create databases → migrate → seed → start works by following the README
- [ ] **Review with Palm**; then plan V2 (Swagger first)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Row lock + recompute in Prisma needs an interactive transaction with `$queryRaw … FOR UPDATE`; easy to get wrong | High | Task 17 goes first in its phase and has a `Promise.all` concurrency e2e test that fails without the lock |
| Prisma 7 / Nest 12 APIs differ from older tutorials (config file, seed setup, adapter, `StandardSchemaValidationPipe`) | Medium | Copy working setup from `dnc03`; check docs.nestjs.com and prisma.io docs when something new is needed (seed command in `prisma.config.ts`) |
| E2E tests sharing one test DB interfere with each other | Medium | Harness truncates all tables before each test file; Vitest e2e config runs files sequentially |
| `sort=rating` must put unrated Movies last in both directions | Low | Prisma `orderBy: { ratingAvg: { sort, nulls: 'last' } }`; covered by tests in Task 10 and Task 20 |
| Porting `dnc03` carries its bugs over (RoleGuard always `true`, password hash returned) | Medium | Tasks 4 and 6 have explicit tests for both |
| Seed synopses copied from other sites (copyright) | Low | Write one-line synopses in our own words; no posters or photos |

## Parallelization

Everything shares one `schema.prisma` and one migration history, so tasks run **one at a time**. The only safe parallel work is writing extra tests for tasks that are already done.

## Open Questions

- ADR for "store Community Rating on Movie instead of computing it live": write it in Task 17? (Recommended: yes, `docs/adr/0001-denormalized-community-rating.md`.)
