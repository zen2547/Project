# Spec: catalogue — V1

Module of [CAPABILITY-MAP.md](./CAPABILITY-MAP.md). Shared stack, structure, style, testing and boundaries live there.

## Objective

Hold everything an IMDb-style movie page shows, so that a single `GET /movies/:id` can render the page: header (title, year, **Certification**, runtime), poster, **Trailers**, **Photos**, **Genres** and **Keywords** chips, synopsis, Director / Writers / Stars, **Community Rating**, and where to watch it. **Guests** read; only **Admins** create, edit and delete.

## Data model

```prisma
enum Certification {
  G
  PG
  PG_13
  R
  NC_17
  NOT_RATED
}

enum CreditRole {
  DIRECTOR
  WRITER
  CAST
}

model Movie {
  id             Int            @id @default(autoincrement())
  title          String
  releaseYear    Int
  certification  Certification  @default(NOT_RATED)
  runtimeMinutes Int?
  synopsis       String?
  posterUrl      String?
  ratingAvg      Decimal?       @db.Decimal(3, 1)   // owned by the reviews module
  reviewCount    Int            @default(0)         // owned by the reviews module
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  genres         Genre[]
  keywords       Keyword[]
  credits        Credit[]
  trailers       Trailer[]
  photos         Photo[]
  streamingLinks StreamingLink[]
}

model Genre   { id Int @id @default(autoincrement())  name String @unique  movies Movie[] }
model Keyword { id Int @id @default(autoincrement())  name String @unique  movies Movie[] }

model Person {
  id        Int      @id @default(autoincrement())
  name      String
  bio       String?
  photoUrl  String?
  birthDate DateTime? @db.Date
  credits   Credit[]
}

model Credit {
  id        Int        @id @default(autoincrement())
  movieId   Int
  personId  Int
  role      CreditRole
  character String?    // CAST only
  order     Int        @default(0)   // billing order; lowest first
  movie     Movie      @relation(fields: [movieId], references: [id], onDelete: Cascade)
  person    Person     @relation(fields: [personId], references: [id], onDelete: Restrict)
  @@unique([movieId, personId, role])
}

model Trailer {
  id         Int    @id @default(autoincrement())
  movieId    Int
  title      String
  youtubeUrl String
  movie      Movie  @relation(fields: [movieId], references: [id], onDelete: Cascade)
}

model Photo {
  id       Int     @id @default(autoincrement())
  movieId  Int
  url      String
  caption  String?
  movie    Movie   @relation(fields: [movieId], references: [id], onDelete: Cascade)
}

model StreamingService {
  id      Int             @id @default(autoincrement())
  name    String          @unique
  logoUrl String?
  links   StreamingLink[]
}

model StreamingLink {
  movieId   Int
  serviceId Int
  url       String
  movie     Movie            @relation(fields: [movieId], references: [id], onDelete: Cascade)
  service   StreamingService @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  @@id([movieId, serviceId])
}
```

## Endpoints

### Public reads

| Method | Path | Notes |
|---|---|---|
| GET | `/movies` | `?q=` (title, case-insensitive contains), `?genreId=`, `?keywordId=`, `?year=`, `?sort=rating\|year\|newest` (default `newest`), `?order=asc\|desc`, pagination. Item: `{ id, title, releaseYear, certification, runtimeMinutes, posterUrl, communityRating }` |
| GET | `/movies/:id` | Full page — see response shape below |
| GET | `/movies/:id/credits` | Full cast & crew grouped `{ directors, writers, cast }` |
| GET | `/people/:id` | Person + filmography (each Credit with its Movie's id, title, year, poster) |
| GET | `/people` | `?q=` name search, pagination |
| GET | `/genres`, `/keywords`, `/streaming-services` | Full lists, sorted by name |

`GET /movies/:id` response:

```json
{
  "id": 1, "title": "Inception", "releaseYear": 2010, "certification": "PG_13",
  "runtimeMinutes": 148, "synopsis": "...", "posterUrl": null,
  "genres": [{ "id": 3, "name": "Sci-Fi" }],
  "keywords": [{ "id": 9, "name": "Dream" }],
  "directors": [{ "personId": 4, "name": "Christopher Nolan" }],
  "writers":   [{ "personId": 4, "name": "Christopher Nolan" }],
  "stars":     [{ "personId": 7, "name": "Leonardo DiCaprio", "character": "Cobb" }],
  "trailers":  [{ "id": 1, "title": "Official Trailer", "youtubeUrl": "https://..." }],
  "photos":    [{ "id": 1, "url": "https://...", "caption": null }],
  "communityRating": { "average": 8.7, "count": 5 },
  "streamingLinks": [{ "service": { "id": 1, "name": "Netflix", "logoUrl": null }, "url": "https://..." }]
}
```

`stars` = the first 3 **Cast Credits** by `order`. `communityRating` is `null` when there are no Reviews.

### Admin writes (`@Role('ADMIN')`)

| Method | Path | Body |
|---|---|---|
| POST / PATCH / DELETE | `/movies`, `/movies/:id` | `{ title, releaseYear, certification?, runtimeMinutes?, synopsis?, posterUrl?, genreIds?, keywordIds? }` — PATCH is partial; `genreIds`/`keywordIds` replace the whole set |
| POST / PATCH / DELETE | `/people`, `/people/:id` | `{ name, bio?, photoUrl?, birthDate? }` |
| POST / PATCH / DELETE | `/genres`, `/keywords`, `/streaming-services` (+ `/:id`) | `{ name }` (+ `logoUrl?` for services) |
| POST | `/movies/:id/credits` | `{ personId, role, character?, order? }` |
| PATCH / DELETE | `/movies/:id/credits/:creditId` | `{ character?, order? }` |
| POST | `/movies/:id/trailers` | `{ title, youtubeUrl }` |
| DELETE | `/movies/:id/trailers/:trailerId` | — |
| POST | `/movies/:id/photos` | `{ url, caption? }` |
| DELETE | `/movies/:id/photos/:photoId` | — |
| PUT | `/movies/:id/streaming-links/:serviceId` | `{ url }` (create or replace) |
| DELETE | `/movies/:id/streaming-links/:serviceId` | — |

## Rules

- `releaseYear` 1888 – (current year + 5); `runtimeMinutes` 1–600; URLs must be `https`; `youtubeUrl` must be on youtube.com or youtu.be
- `character` is allowed only on `CAST` credits (400 otherwise)
- Deleting a Movie deletes its Credits, Trailers, Photos, Streaming Links, Reviews, Watchlist and Watched entries
- Deleting a Person who still has Credits → **409** (remove their Credits first); deleting a Genre/Keyword just detaches it from Movies
- Duplicate Genre/Keyword/Streaming Service name → **409**; same Person + Movie + role twice → **409**
- Unknown `genreIds`, `keywordIds` or `personId` → **400** naming the bad ids
- `ratingAvg` and `reviewCount` are never writable through these endpoints

## Seed (mock data)

12 real, well-known movies (e.g. The Shawshank Redemption, The Godfather, The Dark Knight, Inception, Interstellar, Parasite, Spirited Away, Pulp Fiction, Fight Club, Forrest Gump, The Matrix, Your Name), each with: Genres, 2–4 Keywords, Certification, runtime, synopsis written in our own words, Director(s), Writer(s), top 3–5 Cast with characters, 1 Trailer link, and 1–2 Streaming Links. `posterUrl` and Photos stay empty (no hot-linking copyrighted images).

## Success Criteria

- [ ] A Guest can list, search, filter and sort Movies, and the `meta.total` matches the filter
- [ ] `sort=rating` puts Movies with no Reviews last, regardless of `order`
- [ ] `GET /movies/:id` returns every field in the response shape above in **one** request; unknown id → 404
- [ ] `GET /people/:id` lists that Person's Movies with their Credit role
- [ ] Every Admin write returns 401 with no token and 403 for a Member
- [ ] Each rule above has a test (409 duplicates, 400 unknown ids, 400 `character` on a non-CAST credit, 409 deleting a credited Person)
- [ ] Deleting a Movie removes its children and leaves Genres, Keywords, People and Streaming Services intact
- [ ] After seeding, `GET /movies` returns 12 Movies, each with at least one Director and one Cast Credit

## Out of Scope

Popularity, external ratings, critic reviews, Trivia/FAQ, file uploads, TV series/episodes, per-country streaming, multiple languages.
