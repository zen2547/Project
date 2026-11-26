import type {
  Certification,
  CreditRole,
  Prisma,
} from '../../prisma/generated/prisma/client.js';
import type { MovieListRow, MoviePageRow } from './movies.repository.js';

export type CommunityRating = { average: number; count: number } | null;

// No Reviews yet → null, never { average: 0 }: 0 would read as "terrible".
export function toCommunityRating(
  ratingAvg: Prisma.Decimal | null,
  reviewCount: number,
): CommunityRating {
  return ratingAvg === null
    ? null
    : { average: ratingAvg.toNumber(), count: reviewCount };
}

// One row of GET /movies.
export type MovieListItem = {
  id: number;
  title: string;
  releaseYear: number;
  certification: Certification;
  runtimeMinutes: number | null;
  posterUrl: string | null;
  communityRating: CommunityRating;
};

export function toMovieListItem(row: MovieListRow): MovieListItem {
  return {
    id: row.id,
    title: row.title,
    releaseYear: row.releaseYear,
    certification: row.certification,
    runtimeMinutes: row.runtimeMinutes,
    posterUrl: row.posterUrl,
    communityRating: toCommunityRating(row.ratingAvg, row.reviewCount),
  };
}

// How many Cast Credits the page header shows as "Stars".
export const STAR_COUNT = 3;

type CrewMember = { personId: number; name: string };

// The response shape of GET /movies/:id (SPEC-catalogue.md).
export type MoviePage = {
  id: number;
  title: string;
  releaseYear: number;
  certification: Certification;
  runtimeMinutes: number | null;
  synopsis: string | null;
  posterUrl: string | null;
  genres: { id: number; name: string }[];
  keywords: { id: number; name: string }[];
  directors: CrewMember[];
  writers: CrewMember[];
  stars: (CrewMember & { character: string | null })[];
  trailers: { id: number; title: string; youtubeUrl: string }[];
  photos: { id: number; url: string; caption: string | null }[];
  communityRating: CommunityRating;
  streamingLinks: {
    service: { id: number; name: string; logoUrl: string | null };
    url: string;
  }[];
};

export function toMoviePage(movie: MoviePageRow): MoviePage {
  // `credits` arrive in billing order, so the first CAST are the stars.
  const byRole = (role: CreditRole) =>
    movie.credits.filter((c) => c.role === role);
  const crew = (role: CreditRole) =>
    byRole(role).map((c) => ({ personId: c.person.id, name: c.person.name }));

  return {
    id: movie.id,
    title: movie.title,
    releaseYear: movie.releaseYear,
    certification: movie.certification,
    runtimeMinutes: movie.runtimeMinutes,
    synopsis: movie.synopsis,
    posterUrl: movie.posterUrl,
    genres: movie.genres.map(({ id, name }) => ({ id, name })),
    keywords: movie.keywords.map(({ id, name }) => ({ id, name })),
    directors: crew('DIRECTOR'),
    writers: crew('WRITER'),
    stars: byRole('CAST')
      .slice(0, STAR_COUNT)
      .map((c) => ({
        personId: c.person.id,
        name: c.person.name,
        character: c.character,
      })),
    trailers: movie.trailers.map(({ id, title, youtubeUrl }) => ({
      id,
      title,
      youtubeUrl,
    })),
    photos: movie.photos.map(({ id, url, caption }) => ({ id, url, caption })),
    communityRating: toCommunityRating(movie.ratingAvg, movie.reviewCount),
    streamingLinks: movie.streamingLinks.map(({ service, url }) => ({
      service: { id: service.id, name: service.name, logoUrl: service.logoUrl },
      url,
    })),
  };
}
