import type { Certification } from '../../prisma/generated/prisma/client.js';
import type { MovieWithTaxonomy } from './movies.repository.js';

// The response shape of GET /movies/:id (SPEC-catalogue.md). Credits,
// Trailers, Photos and Streaming Links are added in Tasks 12–13.
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
  communityRating: { average: number; count: number } | null;
};

export function toMoviePage(movie: MovieWithTaxonomy): MoviePage {
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
    // No Reviews yet → null, never { average: 0 }: 0 would read as "terrible".
    communityRating:
      movie.ratingAvg === null
        ? null
        : { average: movie.ratingAvg.toNumber(), count: movie.reviewCount },
  };
}
