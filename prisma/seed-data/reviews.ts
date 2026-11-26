// Mock Members and Reviews for local development (SPEC-reviews.md → Seed).
// 20 Reviews over 10 of the 12 seeded Movies; "Fight Club" and "Your Name"
// stay unreviewed so `sort=rating` has unrated Movies to put last.

// LOCAL DEVELOPMENT ONLY: a known password so you can sign in as these
// Members from Postman. Never seed these accounts anywhere real.
export const SEED_MEMBER_PASSWORD = 'member-pass-123';

export const SEED_MEMBERS = [
  { email: 'mai@imdb.local', displayName: 'Mai' },
  { email: 'ken@imdb.local', displayName: 'Ken' },
  { email: 'nina@imdb.local', displayName: 'Nina' },
] as const;

type MemberName = (typeof SEED_MEMBERS)[number]['displayName'];

export type SeedReview = {
  movie: string; // title in SEED_MOVIES
  by: MemberName;
  score: number;
  comment?: string; // "" on purpose in some rows: stored as null, like the API
};

export const SEED_REVIEWS: SeedReview[] = [
  {
    movie: 'The Shawshank Redemption',
    by: 'Mai',
    score: 10,
    comment: 'Hope is a good thing.',
  },
  { movie: 'The Shawshank Redemption', by: 'Ken', score: 9 },
  { movie: 'The Shawshank Redemption', by: 'Nina', score: 10, comment: '' },
  { movie: 'The Godfather', by: 'Mai', score: 9 },
  {
    movie: 'The Godfather',
    by: 'Ken',
    score: 10,
    comment: 'Slow at first, then impossible to stop watching.',
  },
  {
    movie: 'The Dark Knight',
    by: 'Ken',
    score: 9,
    comment: 'The Joker steals every scene.',
  },
  { movie: 'The Dark Knight', by: 'Nina', score: 8 },
  {
    movie: 'Inception',
    by: 'Mai',
    score: 9,
    comment: 'Still arguing about the ending.',
  },
  { movie: 'Inception', by: 'Ken', score: 8 },
  { movie: 'Inception', by: 'Nina', score: 7, comment: '' },
  {
    movie: 'Interstellar',
    by: 'Nina',
    score: 10,
    comment: 'The docking scene!',
  },
  { movie: 'Interstellar', by: 'Mai', score: 8 },
  {
    movie: 'Parasite',
    by: 'Ken',
    score: 9,
    comment: 'Every staircase means something.',
  },
  { movie: 'Parasite', by: 'Nina', score: 9 },
  { movie: 'Spirited Away', by: 'Mai', score: 10, comment: 'Pure magic.' },
  { movie: 'Pulp Fiction', by: 'Ken', score: 7 },
  {
    movie: 'Pulp Fiction',
    by: 'Nina',
    score: 6,
    comment: 'Fun, but too long for me.',
  },
  { movie: 'Forrest Gump', by: 'Mai', score: 8 },
  {
    movie: 'The Matrix',
    by: 'Ken',
    score: 9,
    comment: 'Red pill, every time.',
  },
  { movie: 'The Matrix', by: 'Nina', score: 8 },
];
