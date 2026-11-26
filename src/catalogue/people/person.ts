import type {
  CreditRole,
  Person,
} from '../../prisma/generated/prisma/client.js';
import type { PersonWithFilmography } from './people.repository.js';

// DATE column → "1970-07-30" (no fake midnight time in the API).
const toDay = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;

export type PersonSummary = {
  id: number;
  name: string;
  photoUrl: string | null;
};

export type PersonDetails = PersonSummary & {
  bio: string | null;
  birthDate: string | null;
};

export type PersonPage = PersonDetails & {
  filmography: {
    creditId: number;
    role: CreditRole;
    character: string | null;
    movie: {
      id: number;
      title: string;
      releaseYear: number;
      posterUrl: string | null;
    };
  }[];
};

export const toPersonSummary = (p: Person): PersonSummary => ({
  id: p.id,
  name: p.name,
  photoUrl: p.photoUrl,
});

export const toPersonDetails = (p: Person): PersonDetails => ({
  ...toPersonSummary(p),
  bio: p.bio,
  birthDate: toDay(p.birthDate),
});

export const toPersonPage = (p: PersonWithFilmography): PersonPage => ({
  ...toPersonDetails(p),
  filmography: p.credits.map((credit) => ({
    creditId: credit.id,
    role: credit.role,
    character: credit.character,
    movie: credit.movie,
  })),
});
