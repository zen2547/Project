# Capability Map: Movie Reviews API — V1

Status: proposed

An IMDb-style backend: **Admins** manage the movie catalogue through CRUD, **Guests** browse it, **Members** post **Reviews** and keep a **Watchlist**. Terms in bold are defined in [GLOSSARY.md](./GLOSSARY.md).

| Module id | Responsibility | Depends on | Spec |
|---|---|---|---|
| identity | Register, login, Members and Admins, JWT, role checks | — | [SPEC-identity.md](./SPEC-identity.md) |
| catalogue | Movies, People, Credits, Genres, Keywords, Trailers, Photos, Streaming Services: public reads, Admin CRUD | identity | [SPEC-catalogue.md](./SPEC-catalogue.md) |
| reviews | Reviews and the Community Rating | identity, catalogue | [SPEC-reviews.md](./SPEC-reviews.md) |
| library | Watchlist and Watched | identity, catalogue | [SPEC-library.md](./SPEC-library.md) |

Build order: identity → catalogue → reviews, library (these two are independent of each other)

One cross-module rule: posting a **Review** marks the **Movie** Watched, so `reviews` calls into `library`'s service. That is the only edge between the two, and it points one way.

---

## Shared conventions (apply to every module spec)

### Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node 24, ESM, TypeScript 6 | Same as `dnc03` |
| Framework | NestJS 12 on Express (`@nestjs/platform-express`) | Reuses what was built in `dnc03` |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) | Relational data with many joins |
| Validation | Zod 4 via `StandardSchemaValidationPipe` + `@Body({ schema })` | Nest 12 native, no class-validator |
| Auth | `@nestjs/jwt` + argon2 | Ported from `dnc03` |
| Tests | Vitest 4 + supertest | Nest 12 default |
| Lint/format | oxlint + prettier | Same as `dnc03` |
| Package manager | pnpm | Same as `dnc03` |
| API docs | `@nestjs/swagger` — **deferred to V2** | Spec first, docs after |

### Commands

```bash
pnpm install
pnpm prisma migrate dev          # apply schema to imdb_dev
pnpm prisma db seed              # 12 movies, people, 1 Admin, 3 Members, ~20 Reviews
pnpm start:dev                   # http://localhost:3000
pnpm test                        # unit tests (*.spec.ts next to source)
pnpm test:e2e                    # e2e tests in test/ against a test database
pnpm lint
pnpm build
```

### Project structure

```
Imdb-web/
├── GLOSSARY.md  CAPABILITY-MAP.md  SPEC-*.md
├── docs/adr/                        architecture decisions
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                      mock data (≥10 real movies)
├── prisma.config.ts
├── src/
│   ├── main.ts  app.module.ts
│   ├── config/                      env schema (zod)
│   ├── common/                      exception filter, pagination schema
│   ├── prisma/                      PrismaService + generated client
│   ├── identity/                    auth controller/service, guards, decorators, user repository, argon
│   ├── catalogue/
│   │   ├── movies/                  controller, service, repository, dto/
│   │   ├── people/
│   │   ├── genres/
│   │   ├── keywords/
│   │   └── streaming-services/
│   ├── reviews/
│   └── library/
└── test/                            e2e specs, one per module
```

Each feature folder follows `dnc03`'s layering: **controller** (HTTP + validation) → **service** (rules, throws `HttpException`s) → **repository** (Prisma only).

### Code style

```ts
// src/catalogue/genres/dto/create-genre.dto.ts
import z from 'zod';

export const createGenreSchema = z.object({
  name: z.string().trim().min(1).max(40),
});
export type CreateGenreDto = z.infer<typeof createGenreSchema>;

// src/catalogue/genres/genres.controller.ts
@Controller('genres')
export class GenresController {
  constructor(private readonly genres: GenresService) {}

  @Public()
  @Get()
  list() {
    return this.genres.list();
  }

  @Role('ADMIN')
  @Post()
  create(@Body({ schema: createGenreSchema }) dto: CreateGenreDto) {
    return this.genres.create(dto);
  }
}
```

- Relative imports end in `.js`; no `__dirname` (use `import.meta.dirname`)
- Files kebab-case, classes PascalCase, one Zod schema + inferred type per DTO
- Repositories return `null` for "not found"; services turn that into `NotFoundException`
- IDs are auto-increment `Int`s; route params validated with `z.coerce.number().int().positive()`

### API conventions

- Errors: `{ "message": string | string[] }` with the right status (400, 401, 403, 404, 409)
- Lists: `?page=1&limit=20` (limit max 50) → `{ "data": [...], "meta": { "page", "limit", "total" } }`
- Every route needs a JWT unless marked `@Public()` (global `AuthGuard`, as in `dnc03`)
- Admin-only routes use `@Role('ADMIN')`; a Member hitting one gets **403**
- No response ever contains a password hash; a Member's email appears only in their own `/auth/me`

### Testing strategy

| Level | What | Where |
|---|---|---|
| Unit | Service rules with repositories mocked via `vi.fn()` (e.g. Community Rating maths, upsert rules) | `src/**/*.spec.ts` |
| E2E | Each endpoint's happy path + auth (401/403) + validation (400) + not found (404) against a real test database | `test/<module>.e2e-spec.ts` |

Target: every success criterion in each module spec has at least one test that proves it.

### Boundaries

- **Always:** validate every body/param/query with Zod; run `pnpm lint` and `pnpm test` before each commit; keep the glossary's words in code names (`Review`, `score`, `comment`, `displayName`)
- **Ask first:** schema changes not in a spec; any new dependency; changing the auth approach; anything listed under *Out of Scope*
- **Never:** commit `.env` or secrets; return password hashes or other Members' emails; delete or skip a failing test to make CI pass

## Out of Scope (Deferred to V2)

- Swagger/OpenAPI docs — after the V1 endpoints settle
- Frontend (Next.js + React, separate repo, designed in Figma first)
- Pulling data from TMDB/OMDb, and external ratings (IMDb score, Metascore, Rotten Tomatoes)
- File uploads for posters/photos (V1 stores URLs)
- Popularity rank and trend, critic reviews, Trivia/FAQ, preferred streaming services, per-country streaming
- `docker-compose.yml` for Postgres (dev + test) and CI
- Soft delete, promoting Members to Admin through the API, refresh tokens

## Open Questions

1. ~~Local Postgres~~ — decided: reuse the local PostgreSQL 18 from `dnc03`, separate `imdb_dev`/`imdb_test` databases. Docker comes later.
