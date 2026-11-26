# Spec: library — V1

Module of [CAPABILITY-MAP.md](./CAPABILITY-MAP.md). Shared stack, structure, style, testing and boundaries live there.

## Objective

Give each **Member** two private lists: a **Watchlist** ("Add to Watchlist") and **Watched** ("Mark as watched"), plus one call that tells a movie page the caller's own state for that Movie.

## Data model

```prisma
model WatchlistItem {
  userId  Int
  movieId Int
  addedAt DateTime @default(now())
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie   Movie    @relation(fields: [movieId], references: [id], onDelete: Cascade)
  @@id([userId, movieId])
}

model WatchedEntry {
  userId    Int
  movieId   Int
  watchedAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie     Movie    @relation(fields: [movieId], references: [id], onDelete: Cascade)
  @@id([userId, movieId])
}
```

## Endpoints (all Member-only)

| Method | Path | Returns |
|---|---|---|
| GET | `/me/watchlist` | paginated, newest added first; each item `{ addedAt, movie: { id, title, releaseYear, posterUrl, communityRating } }` |
| PUT | `/me/watchlist/:movieId` | `204` — idempotent add |
| DELETE | `/me/watchlist/:movieId` | `204` — idempotent remove |
| GET | `/me/watched` | same shape with `watchedAt` |
| PUT | `/me/watched/:movieId` | `204` — idempotent mark |
| DELETE | `/me/watched/:movieId` | `204` — idempotent unmark |
| GET | `/me/movies/:movieId` | `{ inWatchlist: boolean, watched: boolean, myReview: { score, comment } \| null }` |

`GET /me/movies/:movieId` exists so `GET /movies/:id` can stay public and cacheable; the frontend calls both.

## Rules

- PUT on something already there, or DELETE on something not there, still returns 204 (idempotent — a double click never errors)
- Unknown `movieId` → 404
- Watchlist and Watched are independent: marking Watched does not remove the Movie from the Watchlist
- Exposes `markWatched(userId, movieId)` for the reviews module to call inside its transaction

## Success Criteria

- [ ] Add → list → remove works for both lists; the second identical PUT/DELETE still returns 204
- [ ] One Member never sees another Member's lists
- [ ] `GET /me/movies/:id` reflects the Watchlist, Watched and Review state correctly in all combinations
- [ ] All routes return 401 without a token; unknown Movie → 404

## Out of Scope

Public/shared lists, custom named lists, ratings inside lists, "watched on" date editing, import from IMDb.
