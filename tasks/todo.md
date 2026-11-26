# Tasks: Movie Reviews API — V1

Plan: [plan.md](./plan.md). Every task: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build` green before it counts as done.

---

## Phase 1: Foundation

### Task 1: Scaffold the Nest app ✅
**Description:** Create the NestJS 12 ESM project in `Imdb-web` with the same tooling as `dnc03` (pnpm, TypeScript 6, Vitest 4, oxlint, prettier), plus `.gitignore`, `.env.example` and a README stub. No database yet.

**Acceptance criteria:**
- [x] `pnpm start:dev` serves the app on port 3000
- [x] `pnpm build`, `pnpm lint`, `pnpm test` all succeed (one trivial unit test)
- [x] `.env` is git-ignored; `.env.example` lists every variable from the specs

**Verification:** `pnpm build && pnpm lint && pnpm test`; open `http://localhost:3000`
**Dependencies:** None
**Files:** `package.json`, `tsconfig*.json`, `nest-cli.json`, `vitest.config.ts`, `src/main.ts`, `src/app.module.ts`, `.gitignore`, `.env.example`, `README.md` (scaffold config: exempt from the 5-file guideline)
**Scope:** M

### Task 2: Postgres, Prisma, env validation, error filter ✅
**Description:** Create `imdb_dev` + `imdb_test` on the local Postgres 18 that `dnc03` uses (Docker deferred), Prisma 7 with the pg adapter, `PrismaService`, the Zod env schema, the global `StandardSchemaValidationPipe`, and `GlobalExceptionFilter` (ported from `dnc03`).

**Acceptance criteria:**
- [x] `pnpm prisma migrate status` connects to `imdb_dev` and reports it up to date (no models yet; the first migration lands in Task 4)
- [x] App refuses to start with a clear error if `DATABASE_URL` or `JWT_SECRET` is missing
- [x] Unknown route returns `404 { "message": … }` in the spec's error shape

**Verification:** run both commands; start with a broken `.env`; `curl` an unknown route
**Dependencies:** 1
**Files:** `pnpm-workspace.yaml`, `prisma.config.ts`, `prisma/schema.prisma`, `src/prisma/prisma.service.ts`, `src/prisma/prisma.module.ts`, `src/config/env.schema.ts`, `src/common/global-exception.filter.ts`
**Scope:** M

### Task 3: E2E test harness ✅
**Description:** `vitest.config.e2e.ts` running files sequentially against `imdb_test`; a helper that boots the app the same way `main.ts` does and truncates all tables before each test file. (The token-for-a-role helper moved to Tasks 5–6, once login exists.)

**Acceptance criteria:**
- [x] `pnpm test:e2e` runs migrations on `imdb_test` and passes a smoke test (`404` on unknown route)
- [x] Two test files writing the same data don't interfere (files run sequentially; each starts from a truncated DB; refuses any DB not named `*_test`)

**Verification:** `pnpm test:e2e` twice in a row
**Dependencies:** 2
**Files:** `vitest.config.e2e.ts`, `src/app.setup.ts`, `test/helpers/{app,db,global-setup,test-database-url}.ts`, `test/smoke.e2e-spec.ts`
**Scope:** S

### Checkpoint A: Foundation
- [ ] All four commands green; clean clone + create databases + migrate works

---

## Phase 2: identity — [SPEC-identity.md](../SPEC-identity.md)

### Task 4: Member can register ✅
**Description:** `User` model (email, passwordHash, displayName, role, createdAt) + migration; argon service; `POST /auth/register` with Zod DTO; user repository/service.

**Acceptance criteria:**
- [x] 201 with `{ id, email, displayName, role: "MEMBER" }` and **no** `passwordHash`
- [x] 409 on an existing email in any letter case; 400 on 7-char password or missing `displayName`

**Verification:** `pnpm test:e2e -- identity`
**Dependencies:** 3
**Files:** `prisma/schema.prisma`, `src/identity/auth.controller.ts`, `src/identity/auth.service.ts`, `src/identity/user.repository.ts`, `src/identity/dto/register.dto.ts`, `test/identity.e2e-spec.ts`
**Scope:** M

### Task 5: Member can log in and see `/auth/me` ✅
**Description:** Add `test/helpers/auth.ts` (register + log in a Member, return a token). `POST /auth/login` returning `{ accessToken }` with payload `{ sub, role }`; global `AuthGuard` + `@Public()`; `@CurrentUser()` decorator; `GET /auth/me`.

**Acceptance criteria:**
- [x] Correct credentials → `{ accessToken }`; wrong email and wrong password → same 401 message
- [x] `/auth/me` → 401 without token, own profile with token

**Verification:** `pnpm test:e2e -- identity`
**Dependencies:** 4
**Files:** `src/identity/auth.guard.ts`, `src/identity/decorators/public.decorator.ts`, `src/identity/decorators/current-user.decorator.ts`, `src/identity/auth.controller.ts`, `test/identity.e2e-spec.ts`
**Scope:** M

### Task 6: Admin-only routes and seeded Admin ✅
**Description:** `@Role('ADMIN')` + a `RoleGuard` that actually rejects (fixing `dnc03`'s always-`true`); extend `test/helpers/auth.ts` with an Admin token; seed script skeleton that upserts the Admin from `.env`; wire `pnpm prisma db seed`.

**Acceptance criteria:**
- [x] A test-only Admin route returns 403 for a Member, 200 for an Admin, 401 without token
- [x] After `pnpm prisma db seed`, the `.env` Admin can log in; running seed twice doesn't fail

**Verification:** `pnpm test:e2e -- identity`; run seed twice, then log in with `curl`
**Dependencies:** 5
**Files:** `src/identity/role.guard.ts`, `src/identity/decorators/role.decorator.ts`, `prisma/seed.ts`, `prisma/seed/admin.ts`, `prisma.config.ts`, `test/helpers/auth.ts`, `test/roles.e2e-spec.ts`
**Scope:** M

### Checkpoint B: identity
- [x] All SPEC-identity success criteria tested and green
- [ ] Review with Palm

---

## Phase 3: catalogue — [SPEC-catalogue.md](../SPEC-catalogue.md)

### Task 7: Admin manages Genres and Keywords ✅
**Description:** `Genre` and `Keyword` models; public `GET /genres`, `GET /keywords` (sorted by name); Admin POST/PATCH/DELETE for both.

**Acceptance criteria:**
- [x] CRUD works for Admin; Member → 403; no token on writes → 401
- [x] Duplicate name → 409; unknown id → 404

**Verification:** `pnpm test:e2e -- taxonomy`
**Dependencies:** 6
**Files:** `prisma/schema.prisma`, `src/catalogue/genres/*`, `src/catalogue/keywords/*`, `test/taxonomy.e2e-spec.ts`
**Scope:** M

### Task 8: Admin manages Streaming Services ✅
**Description:** `StreamingService` model; public list; Admin CRUD.

**Acceptance criteria:**
- [x] CRUD + auth rules as in Task 7; duplicate name → 409; non-https `logoUrl` → 400

**Verification:** `pnpm test:e2e -- streaming`
**Dependencies:** 6
**Files:** `prisma/schema.prisma`, `src/catalogue/streaming-services/*`, `test/streaming.e2e-spec.ts`
**Scope:** S

### Task 9: Admin creates/edits/deletes a Movie; anyone can view it ✅
**Description:** `Movie` model (incl. `ratingAvg`, `reviewCount`, Certification enum) with Genre/Keyword relations; Admin POST/PATCH/DELETE `/movies`; public `GET /movies/:id` returning the core fields, `genres`, `keywords` and `communityRating: null`.

**Acceptance criteria:**
- [x] `genreIds`/`keywordIds` replace the whole set; unknown ids → 400 naming them
- [x] Validation rules (year range, runtime range, https URLs) → 400; `ratingAvg`/`reviewCount` in a body are rejected
- [x] Unknown id → 404; deleting a Movie leaves its Genres and Keywords

**Verification:** `pnpm test:e2e -- movies`
**Dependencies:** 7
**Files:** `prisma/schema.prisma`, `src/catalogue/movies/movies.controller.ts`, `src/catalogue/movies/movies.service.ts`, `src/catalogue/movies/movies.repository.ts`, `src/catalogue/movies/dto/*`, `test/movies.e2e-spec.ts`
**Scope:** M

### Task 10: Anyone can browse Movies ✅
**Description:** Shared pagination schema + response helper; `GET /movies` with `q`, `genreId`, `keywordId`, `year`, `sort=rating|year|newest`, `order`, `page`, `limit`.

**Acceptance criteria:**
- [x] Each filter narrows results and `meta.total` matches; `limit` > 50 → 400
- [x] `sort=rating` puts Movies with `ratingAvg = null` last for both `asc` and `desc` (test sets ratings directly in the DB)

**Verification:** `pnpm test:e2e -- movies`
**Dependencies:** 9
**Files:** `src/common/pagination.ts`, `src/catalogue/movies/dto/list-movies.dto.ts`, `src/catalogue/movies/movies.repository.ts`, `src/catalogue/movies/movies.controller.ts`, `test/movies-browse.e2e-spec.ts`
**Scope:** M

### Task 11: Admin manages People; anyone sees a filmography ✅
**Description:** `Person` + `Credit` models (CreditRole enum); public `GET /people?q=`, `GET /people/:id` with filmography; Admin CRUD on `/people`.

**Acceptance criteria:**
- [x] CRUD + auth rules; name search paginates
- [x] Deleting a Person who has Credits → 409 (test inserts a Credit directly)

**Verification:** `pnpm test:e2e -- people`
**Dependencies:** 9
**Files:** `prisma/schema.prisma`, `src/catalogue/people/*`, `test/people.e2e-spec.ts`
**Scope:** M

### Task 12: Admin adds Credits; movie page shows Directors/Writers/Stars ✅
**Description:** `POST /movies/:id/credits`, `PATCH`/`DELETE /movies/:id/credits/:creditId`; `GET /movies/:id/credits` grouped; `GET /movies/:id` gains `directors`, `writers`, `stars` (top 3 Cast by `order`).

**Acceptance criteria:**
- [x] `character` on a non-CAST credit → 400; same Person + Movie + role twice → 409; unknown `personId` → 400
- [x] `stars` shows exactly the 3 lowest-`order` Cast Credits; `GET /people/:id` now lists the Movie

**Verification:** `pnpm test:e2e -- credits`
**Dependencies:** 11
**Files:** `src/catalogue/movies/credits.controller.ts`, `src/catalogue/movies/credits.service.ts`, `src/catalogue/movies/dto/credit.dto.ts`, `src/catalogue/movies/movies.repository.ts`, `test/credits.e2e-spec.ts`
**Scope:** M

### Checkpoint C: catalogue core
- [x] All tests green; a Movie with Genres, Keywords and Credits renders fully from `GET /movies/:id`

### Task 13: Trailers, Photos and Streaming Links on a Movie ✅
**Description:** `Trailer`, `Photo`, `StreamingLink` models; Admin POST/DELETE trailers and photos; PUT/DELETE streaming links; `GET /movies/:id` gains `trailers`, `photos`, `streamingLinks`.

**Acceptance criteria:**
- [x] Non-YouTube `youtubeUrl` → 400; PUT on the same streaming link twice keeps one row with the new URL
- [x] Deleting a Movie removes its Credits, Trailers, Photos and Streaming Links but not People or Streaming Services

**Verification:** `pnpm test:e2e -- movie-media`
**Dependencies:** 8, 12
**Files:** `prisma/schema.prisma`, `src/catalogue/movies/media.controller.ts`, `src/catalogue/movies/media.service.ts`, `src/catalogue/movies/movies.repository.ts`, `test/movie-media.e2e-spec.ts`
**Scope:** M

### Task 14: Seed 12 real Movies with full page data ✅
**Description:** Extend `prisma/seed.ts`: Genres, Keywords, Streaming Services, People, and the 12 Movies from the spec with Credits, a Trailer link and Streaming Links. Synopses in our own words; no posters or photos.

**Acceptance criteria:**
- [x] After seeding, `GET /movies` → `meta.total = 12`; each Movie has ≥1 Director and ≥1 Cast Credit
- [x] Seed is re-runnable

**Verification:** `pnpm prisma db seed` twice; spot-check `GET /movies/:id` for 2 Movies
**Dependencies:** 13
**Files:** `prisma/seed.ts`, `prisma/seed-data/movies.ts`
**Scope:** M

### Checkpoint D: catalogue complete
- [x] SPEC-catalogue success criteria tested and green
- [ ] Review with Palm

---

## Phase 4: library + reviews — [SPEC-library.md](../SPEC-library.md), [SPEC-reviews.md](../SPEC-reviews.md)

### Task 15: Member keeps a Watchlist
**Description:** `WatchlistItem` model; `GET /me/watchlist`, `PUT`/`DELETE /me/watchlist/:movieId`.

**Acceptance criteria:**
- [ ] Add → list → remove works; a repeated PUT or DELETE still returns 204
- [ ] Member A never sees Member B's list; unknown Movie → 404; no token → 401

**Verification:** `pnpm test:e2e -- watchlist`
**Dependencies:** 9
**Files:** `prisma/schema.prisma`, `src/library/watchlist.controller.ts`, `src/library/library.service.ts`, `src/library/library.repository.ts`, `test/watchlist.e2e-spec.ts`
**Scope:** M

### Task 16: Member marks Movies Watched
**Description:** `WatchedEntry` model; `GET /me/watched`, `PUT`/`DELETE /me/watched/:movieId`; export `markWatched(userId, movieId, tx?)` from `LibraryModule` so a caller can pass a transaction.

**Acceptance criteria:**
- [ ] Same behaviour as Task 15 for Watched; Watched does not remove the Movie from the Watchlist
- [ ] `markWatched` unit test: works with and without a transaction client

**Verification:** `pnpm test:e2e -- watched`; `pnpm test -- library`
**Dependencies:** 15
**Files:** `prisma/schema.prisma`, `src/library/watched.controller.ts`, `src/library/library.service.ts`, `src/library/library.service.spec.ts`, `test/watched.e2e-spec.ts`
**Scope:** M

### Task 17: Member posts/replaces a Review; Community Rating stays correct
**Description:** `Review` model; `PUT /movies/:id/review` upsert inside one interactive transaction: lock the Movie row, upsert the Review, recompute `reviewCount`/`ratingAvg`, call `markWatched`. Write ADR 0001 if approved.

**Acceptance criteria:**
- [ ] Two PUTs → one Review with the second Score; `GET /movies/:id` shows the updated `communityRating`
- [ ] Scores 0, 11, 7.5 → 400; the Movie then appears in `/me/watched`
- [ ] Concurrency test: two Members PUT at once via `Promise.all` → `count = 2`, correct average

**Verification:** `pnpm test:e2e -- reviews`; `pnpm test -- reviews` (unit test for average/rounding maths)
**Dependencies:** 16
**Files:** `prisma/schema.prisma`, `src/reviews/reviews.controller.ts`, `src/reviews/reviews.service.ts`, `src/reviews/reviews.repository.ts`, `test/reviews.e2e-spec.ts`
**Scope:** M (highest risk in the plan)

### Task 18: Read Reviews; delete own; list own
**Description:** `GET /movies/:id/reviews` (public, newest first, author `{ id, displayName }`), `DELETE /movies/:id/review` (same transaction + recompute), `GET /me/reviews`.

**Acceptance criteria:**
- [ ] Create → replace → delete leaves `communityRating` correct at each step, ending at `null`; Watched stays
- [ ] No response contains an email; DELETE with no own Review → 404

**Verification:** `pnpm test:e2e -- reviews`
**Dependencies:** 17
**Files:** `src/reviews/reviews.controller.ts`, `src/reviews/reviews.service.ts`, `src/reviews/reviews.repository.ts`, `src/reviews/me-reviews.controller.ts`, `test/reviews.e2e-spec.ts`
**Scope:** M

### Task 19: `GET /me/movies/:movieId`
**Description:** One endpoint returning `{ inWatchlist, watched, myReview }` for the caller.

**Acceptance criteria:**
- [ ] Correct for all combinations (none, watchlist only, watched only, reviewed); unknown Movie → 404; no token → 401

**Verification:** `pnpm test:e2e -- me-movie`
**Dependencies:** 18
**Files:** `src/library/me-movie.controller.ts`, `src/library/library.service.ts`, `test/me-movie.e2e-spec.ts`
**Scope:** S

### Checkpoint E: reviews + library
- [ ] All SPEC-reviews and SPEC-library success criteria tested and green

### Task 20: Seed Members and Reviews; prove rating sort end to end
**Description:** Seed 3 Members and ~20 Reviews across the 12 Movies (some with empty Comments, at least 2 Movies with none), computing ratings with the same function as the service; one e2e test that sorts real reviewed data by rating.

**Acceptance criteria:**
- [ ] After seeding, `GET /movies?sort=rating&order=desc` lists rated Movies by average, unrated ones last
- [ ] Seeded ratings match what the service would compute

**Verification:** `pnpm prisma db seed`; `curl` the sort; `pnpm test:e2e`
**Dependencies:** 14, 18
**Files:** `prisma/seed.ts`, `prisma/seed-data/reviews.ts`, `src/reviews/community-rating.ts`, `test/movies-browse.e2e-spec.ts`
**Scope:** S

### Checkpoint F: V1 complete
- [ ] Every success criterion in all four specs maps to a passing test
- [ ] README steps work from a clean clone
- [ ] Review with Palm; next: V2 delta spec for Swagger
