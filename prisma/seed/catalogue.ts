import type { PrismaClient } from '../../src/prisma/generated/prisma/client.js';
import {
  SEED_MOVIES,
  SEED_SERVICES,
  type SeedServiceName,
} from '../seed-data/movies.js';

const unique = (names: string[]) => [...new Set(names)].sort();

const trailerSearchUrl = (title: string, year: number) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${title} ${year} official trailer`,
  )}`;

const streamingSearchUrl = (service: SeedServiceName, title: string) =>
  `${SEED_SERVICES[service]}${encodeURIComponent(title)}`;

export type CatalogueSeedResult = { movies: number; people: number };

/**
 * Replace the whole catalogue with SEED_MOVIES.
 *
 * Re-runnable: it empties the catalogue tables first (RESTART IDENTITY, so
 * ids come out the same every time) and does everything in one transaction,
 * so a failure leaves the old data in place. Users are never touched;
 * anything that hangs off a Movie (Reviews, Watchlist…) goes with it.
 */
export async function seedCatalogue(
  prisma: PrismaClient,
): Promise<CatalogueSeedResult> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        'TRUNCATE TABLE "Movie", "Person", "Genre", "Keyword", "StreamingService" RESTART IDENTITY CASCADE',
      );

      // Lookup tables first, then name → id maps for the Movies.
      const genreNames = unique(SEED_MOVIES.flatMap((m) => m.genres));
      const keywordNames = unique(SEED_MOVIES.flatMap((m) => m.keywords));
      const personNames = unique(
        SEED_MOVIES.flatMap((m) => [
          ...m.directors,
          ...m.writers,
          ...m.cast.map((c) => c.name),
        ]),
      );
      const serviceNames = Object.keys(SEED_SERVICES) as SeedServiceName[];

      await tx.genre.createMany({ data: genreNames.map((name) => ({ name })) });
      await tx.keyword.createMany({
        data: keywordNames.map((name) => ({ name })),
      });
      await tx.person.createMany({
        data: personNames.map((name) => ({ name })),
      });
      await tx.streamingService.createMany({
        data: serviceNames.map((name) => ({ name })),
      });

      const idsByName = (rows: { id: number; name: string }[]) =>
        new Map(rows.map((r) => [r.name, r.id]));
      const genreId = idsByName(await tx.genre.findMany());
      const keywordId = idsByName(await tx.keyword.findMany());
      const personId = idsByName(await tx.person.findMany());
      const serviceId = idsByName(await tx.streamingService.findMany());
      const id = (map: Map<string, number>, name: string) => {
        const found = map.get(name);
        if (found === undefined) throw new Error(`Seed: no id for "${name}"`);
        return found;
      };

      for (const movie of SEED_MOVIES) {
        await tx.movie.create({
          data: {
            title: movie.title,
            releaseYear: movie.releaseYear,
            certification: movie.certification,
            runtimeMinutes: movie.runtimeMinutes,
            synopsis: movie.synopsis,
            genres: {
              connect: movie.genres.map((n) => ({ id: id(genreId, n) })),
            },
            keywords: {
              connect: movie.keywords.map((n) => ({ id: id(keywordId, n) })),
            },
            credits: {
              create: [
                ...movie.directors.map((name, order) => ({
                  personId: id(personId, name),
                  role: 'DIRECTOR' as const,
                  order,
                })),
                ...movie.writers.map((name, order) => ({
                  personId: id(personId, name),
                  role: 'WRITER' as const,
                  order,
                })),
                ...movie.cast.map(({ name, character }, order) => ({
                  personId: id(personId, name),
                  role: 'CAST' as const,
                  character,
                  order,
                })),
              ],
            },
            trailers: {
              create: [
                {
                  title: 'Official Trailer',
                  youtubeUrl: trailerSearchUrl(movie.title, movie.releaseYear),
                },
              ],
            },
            streamingLinks: {
              create: movie.streamingOn.map((service) => ({
                serviceId: id(serviceId, service),
                url: streamingSearchUrl(service, movie.title),
              })),
            },
          },
        });
      }

      return { movies: SEED_MOVIES.length, people: personNames.length };
    },
    { timeout: 30_000 },
  );
}
