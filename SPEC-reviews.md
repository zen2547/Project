# Spec: reviews — V1

Module of [CAPABILITY-MAP.md](./CAPABILITY-MAP.md). Shared stack, structure, style, testing and boundaries live there.

## Objective

Let **Members** give each **Movie** one **Review** (a **Score** 1–10 and an optional **Comment**), let anyone read them, and keep every Movie's **Community Rating** correct at all times.

## Data model

```prisma
model Review {
  id        Int      @id @default(autoincrement())
  userId    Int
  movieId   Int
  score     Int                 // 1–10
  comment   String?             // max 2000 chars
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie     Movie    @relation(fields: [movieId], references: [id], onDelete: Cascade)
  @@unique([userId, movieId])
  @@index([movieId, createdAt])
}
```

This module also owns `Movie.ratingAvg` and `Movie.reviewCount` (declared in the catalogue schema).

## Endpoints

| Method | Path | Access | Body / query | Returns |
|---|---|---|---|---|
| GET | `/movies/:id/reviews` | Public | pagination; newest first | `{ data: [{ id, score, comment, createdAt, updatedAt, author: { id, displayName } }], meta }` |
| PUT | `/movies/:id/review` | Member | `{ score, comment? }` | `200` the caller's Review (created or replaced) |
| DELETE | `/movies/:id/review` | Member | — | `204`; 404 if the caller has no Review on that Movie |
| GET | `/me/reviews` | Member | pagination; newest first | the caller's Reviews, each with `{ movie: { id, title, releaseYear, posterUrl } }` |

`PUT` is an upsert: a Member has at most one Review per Movie, so there is no separate create/update.

## Rules

- `score`: integer 1–10. `comment`: trimmed; empty string is stored as `null`; max 2000 chars
- On every create, replace or delete of a Review, inside **one transaction**:
  1. lock the Movie row (`SELECT … FOR UPDATE`) so two Members reviewing at once can't both read a stale count
  2. write the Review
  3. recompute `reviewCount` and `ratingAvg` (rounded to 1 decimal; `null` when count is 0) from the Reviews table and save them on the Movie
  4. on create or replace, mark the Movie **Watched** for that Member (via the library service)
- Deleting a Review does **not** un-mark Watched
- Author info exposes only `id` and `displayName` — never email
- Admins have no special power over other Members' Reviews in V1

## Seed

3 Members (`ADMIN` excluded) and ~20 Reviews spread over the 12 seeded Movies, with a mix of scores and some empty Comments, so every list and sort has data. The seed computes `ratingAvg`/`reviewCount` the same way the service does.

## Success Criteria

- [x] PUT twice on the same Movie leaves exactly one Review, holding the second Score
- [x] Scores 0, 11 and 7.5 are rejected with 400
- [x] After create → replace → delete, `GET /movies/:id` shows the right `communityRating` at each step, ending at `null`
- [x] Two Members PUTting Reviews on the same Movie concurrently leaves `reviewCount = 2` and the correct average (e2e test with `Promise.all`)
- [x] Posting a Review makes the Movie appear in `GET /me/watched`
- [x] Review lists never contain an email address
- [x] PUT/DELETE/`/me/reviews` without a token → 401; on an unknown Movie → 404

## Out of Scope

Likes/helpful votes on Reviews, spoiler flags, Admin moderation, reporting abuse, Review titles, critic reviews.
