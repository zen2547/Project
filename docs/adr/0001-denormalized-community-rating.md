# Store the Community Rating on the Movie, updated under a row lock

Every Movie list (`GET /movies`) shows a Community Rating and can sort by it, so we store `ratingAvg` and `reviewCount` on `Movie` instead of averaging the Reviews table on every read. The danger with a stored copy is that it goes stale. To prevent that, every Review create, replace and delete runs in one transaction: it locks the Movie row (`SELECT … FOR UPDATE`), writes the Review, and then recomputes both numbers from the Reviews table. If two Members review the same Movie at the same moment, the second one waits for the first, so neither can work from an old count. `test/reviews.e2e-spec.ts` checks this with concurrent requests.

## Considered Options

- **Compute live with `AVG()` / a view.** Always correct, but every sorted and paginated list has to join and group Reviews. Rejected because lists are read far more often than Reviews are written.
- **Increment / decrement the stored numbers (`count + 1`, running average).** Cheaper per write, but a single bug or missed path leaves the numbers wrong forever. Rejected: recomputing from the Reviews table repairs itself on the next write.

## Consequences

- Only the reviews module may write `ratingAvg` / `reviewCount`. The catalogue API rejects them (strict body schemas), and the seed uses the same rounding function (`src/reviews/community-rating.ts`).
- Changing a Score directly in the database (bypassing the API) leaves the stored rating stale until the next Review write on that Movie.
