// Mock catalogue for local development: 12 well-known Movies.
//
// - Synopses are written in our own words (no copying from other sites).
// - No posters or photos: we don't hot-link copyrighted images.
// - Trailer links are YouTube *search* links, not guessed video ids, so
//   they never point at a wrong or deleted video.
// - Streaming Links are illustrative only (availability differs by country
//   and changes over time); they open each service's search page.

import type { Certification } from '../../src/prisma/generated/prisma/enums.js';

export type SeedCast = { name: string; character: string };

export type SeedMovie = {
  title: string;
  releaseYear: number;
  certification: Certification;
  runtimeMinutes: number;
  synopsis: string;
  genres: string[];
  keywords: string[];
  directors: string[];
  writers: string[];
  cast: SeedCast[]; // in billing order: the first 3 are the page's Stars
  streamingOn: SeedServiceName[];
};

export const SEED_SERVICES = {
  Netflix: 'https://www.netflix.com/search?q=',
  'Prime Video': 'https://www.primevideo.com/search?phrase=',
  'Disney+': 'https://www.disneyplus.com/search?q=',
  Max: 'https://play.max.com/search?q=',
  'Apple TV': 'https://tv.apple.com/search?term=',
} as const;
export type SeedServiceName = keyof typeof SEED_SERVICES;

export const SEED_MOVIES: SeedMovie[] = [
  {
    title: 'The Shawshank Redemption',
    releaseYear: 1994,
    certification: 'R',
    runtimeMinutes: 142,
    synopsis:
      'A banker given two life sentences for a murder he insists he did not commit forms a decades-long friendship with a fellow inmate while quietly holding on to hope.',
    genres: ['Drama'],
    keywords: ['prison', 'friendship', 'hope', 'escape'],
    directors: ['Frank Darabont'],
    writers: ['Stephen King', 'Frank Darabont'],
    cast: [
      { name: 'Tim Robbins', character: 'Andy Dufresne' },
      { name: 'Morgan Freeman', character: "Ellis Boyd 'Red' Redding" },
      { name: 'Bob Gunton', character: 'Warden Norton' },
      { name: 'William Sadler', character: 'Heywood' },
    ],
    streamingOn: ['Netflix', 'Max'],
  },
  {
    title: 'The Godfather',
    releaseYear: 1972,
    certification: 'R',
    runtimeMinutes: 175,
    synopsis:
      'The ageing head of a New York crime family sees his reluctant youngest son drawn into the business he never wanted to inherit.',
    genres: ['Crime', 'Drama'],
    keywords: ['mafia', 'family', 'power'],
    directors: ['Francis Ford Coppola'],
    writers: ['Mario Puzo', 'Francis Ford Coppola'],
    cast: [
      { name: 'Marlon Brando', character: 'Vito Corleone' },
      { name: 'Al Pacino', character: 'Michael Corleone' },
      { name: 'James Caan', character: 'Sonny Corleone' },
      { name: 'Diane Keaton', character: 'Kay Adams' },
      { name: 'Robert Duvall', character: 'Tom Hagen' },
    ],
    streamingOn: ['Prime Video'],
  },
  {
    title: 'The Dark Knight',
    releaseYear: 2008,
    certification: 'PG_13',
    runtimeMinutes: 152,
    synopsis:
      'Batman, a determined police lieutenant and a new district attorney try to clean up Gotham, until a criminal who only wants chaos pushes each of them to breaking point.',
    genres: ['Action', 'Crime', 'Drama'],
    keywords: ['superhero', 'vigilante', 'chaos'],
    directors: ['Christopher Nolan'],
    writers: ['Jonathan Nolan', 'Christopher Nolan'],
    cast: [
      { name: 'Christian Bale', character: 'Bruce Wayne / Batman' },
      { name: 'Heath Ledger', character: 'Joker' },
      { name: 'Aaron Eckhart', character: 'Harvey Dent' },
      { name: 'Gary Oldman', character: 'James Gordon' },
      { name: 'Michael Caine', character: 'Alfred Pennyworth' },
    ],
    streamingOn: ['Max'],
  },
  {
    title: 'Inception',
    releaseYear: 2010,
    certification: 'PG_13',
    runtimeMinutes: 148,
    synopsis:
      "A specialist in stealing secrets from people's dreams is offered his old life back if he can do the reverse: plant an idea deep in a target's mind.",
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    keywords: ['dream', 'heist', 'subconscious'],
    directors: ['Christopher Nolan'],
    writers: ['Christopher Nolan'],
    cast: [
      { name: 'Leonardo DiCaprio', character: 'Cobb' },
      { name: 'Joseph Gordon-Levitt', character: 'Arthur' },
      { name: 'Elliot Page', character: 'Ariadne' },
      { name: 'Tom Hardy', character: 'Eames' },
    ],
    streamingOn: ['Netflix', 'Prime Video'],
  },
  {
    title: 'Interstellar',
    releaseYear: 2014,
    certification: 'PG_13',
    runtimeMinutes: 169,
    synopsis:
      'With crops failing on Earth, a former pilot leaves his children behind to cross a wormhole in search of a planet humanity could call home.',
    genres: ['Adventure', 'Drama', 'Sci-Fi'],
    keywords: [
      'space travel',
      'black hole',
      'time',
      'father daughter relationship',
    ],
    directors: ['Christopher Nolan'],
    writers: ['Jonathan Nolan', 'Christopher Nolan'],
    cast: [
      { name: 'Matthew McConaughey', character: 'Cooper' },
      { name: 'Anne Hathaway', character: 'Brand' },
      { name: 'Jessica Chastain', character: 'Murph' },
      { name: 'Michael Caine', character: 'Professor Brand' },
    ],
    streamingOn: ['Prime Video', 'Apple TV'],
  },
  {
    title: 'Parasite',
    releaseYear: 2019,
    certification: 'R',
    runtimeMinutes: 132,
    synopsis:
      'A struggling family talks its way, one member at a time, into jobs with a wealthy household, until a discovery in the basement changes everything.',
    genres: ['Drama', 'Thriller'],
    keywords: ['class differences', 'con artist', 'family'],
    directors: ['Bong Joon Ho'],
    writers: ['Bong Joon Ho', 'Han Jin-won'],
    cast: [
      { name: 'Song Kang-ho', character: 'Kim Ki-taek' },
      { name: 'Lee Sun-kyun', character: 'Park Dong-ik' },
      { name: 'Cho Yeo-jeong', character: 'Park Yeon-kyo' },
      { name: 'Choi Woo-shik', character: 'Kim Ki-woo' },
      { name: 'Park So-dam', character: 'Kim Ki-jeong' },
    ],
    streamingOn: ['Max'],
  },
  {
    title: 'Spirited Away',
    releaseYear: 2001,
    certification: 'PG',
    runtimeMinutes: 125,
    synopsis:
      'A ten-year-old girl wanders into a world of spirits, where she must work in a bathhouse run by a witch to free her parents and find her way home.',
    genres: ['Animation', 'Adventure', 'Fantasy', 'Family'],
    keywords: ['spirit world', 'bathhouse', 'coming of age'],
    directors: ['Hayao Miyazaki'],
    writers: ['Hayao Miyazaki'],
    cast: [
      { name: 'Rumi Hiiragi', character: 'Chihiro Ogino' },
      { name: 'Miyu Irino', character: 'Haku' },
      { name: 'Mari Natsuki', character: 'Yubaba / Zeniba' },
    ],
    streamingOn: ['Netflix', 'Max'],
  },
  {
    title: 'Pulp Fiction',
    releaseYear: 1994,
    certification: 'R',
    runtimeMinutes: 154,
    synopsis:
      'Two hitmen, a boxer, a gangster and his wife cross paths in a handful of Los Angeles stories told out of order.',
    genres: ['Crime', 'Drama'],
    keywords: ['nonlinear timeline', 'hitman', 'gangster'],
    directors: ['Quentin Tarantino'],
    writers: ['Quentin Tarantino', 'Roger Avary'],
    cast: [
      { name: 'John Travolta', character: 'Vincent Vega' },
      { name: 'Samuel L. Jackson', character: 'Jules Winnfield' },
      { name: 'Uma Thurman', character: 'Mia Wallace' },
      { name: 'Bruce Willis', character: 'Butch Coolidge' },
    ],
    streamingOn: ['Prime Video'],
  },
  {
    title: 'Fight Club',
    releaseYear: 1999,
    certification: 'R',
    runtimeMinutes: 139,
    synopsis:
      'An office worker who cannot sleep meets a reckless soap salesman, and together they start an underground club that grows into something far more dangerous.',
    genres: ['Drama'],
    keywords: ['insomnia', 'split personality', 'anti-consumerism'],
    directors: ['David Fincher'],
    writers: ['Chuck Palahniuk', 'Jim Uhls'],
    cast: [
      { name: 'Edward Norton', character: 'The Narrator' },
      { name: 'Brad Pitt', character: 'Tyler Durden' },
      { name: 'Helena Bonham Carter', character: 'Marla Singer' },
      { name: 'Meat Loaf', character: "Robert 'Bob' Paulson" },
    ],
    streamingOn: ['Disney+'],
  },
  {
    title: 'Forrest Gump',
    releaseYear: 1994,
    certification: 'PG_13',
    runtimeMinutes: 142,
    synopsis:
      'A kind-hearted man from Alabama drifts through decades of American history, always hoping to be reunited with his childhood sweetheart.',
    genres: ['Drama', 'Romance'],
    keywords: ['american history', 'friendship', 'running'],
    directors: ['Robert Zemeckis'],
    writers: ['Winston Groom', 'Eric Roth'],
    cast: [
      { name: 'Tom Hanks', character: 'Forrest Gump' },
      { name: 'Robin Wright', character: 'Jenny Curran' },
      { name: 'Gary Sinise', character: 'Lieutenant Dan Taylor' },
      { name: 'Sally Field', character: 'Mrs. Gump' },
    ],
    streamingOn: ['Netflix', 'Prime Video'],
  },
  {
    title: 'The Matrix',
    releaseYear: 1999,
    certification: 'R',
    runtimeMinutes: 136,
    synopsis:
      'A hacker learns that the everyday world is a simulation run by machines and joins a small rebellion fighting to wake humanity up.',
    genres: ['Action', 'Sci-Fi'],
    keywords: ['simulated reality', 'artificial intelligence', 'chosen one'],
    directors: ['Lana Wachowski', 'Lilly Wachowski'],
    writers: ['Lana Wachowski', 'Lilly Wachowski'],
    cast: [
      { name: 'Keanu Reeves', character: 'Neo' },
      { name: 'Laurence Fishburne', character: 'Morpheus' },
      { name: 'Carrie-Anne Moss', character: 'Trinity' },
      { name: 'Hugo Weaving', character: 'Agent Smith' },
    ],
    streamingOn: ['Max', 'Apple TV'],
  },
  {
    title: 'Your Name',
    releaseYear: 2016,
    certification: 'PG',
    runtimeMinutes: 106,
    synopsis:
      "A boy in Tokyo and a girl in a mountain town start waking up in each other's bodies, and set out to meet before a comet changes both their lives.",
    genres: ['Animation', 'Drama', 'Fantasy', 'Romance'],
    keywords: ['body swap', 'comet', 'long distance', 'coming of age'],
    directors: ['Makoto Shinkai'],
    writers: ['Makoto Shinkai'],
    cast: [
      { name: 'Ryunosuke Kamiki', character: 'Taki Tachibana' },
      { name: 'Mone Kamishiraishi', character: 'Mitsuha Miyamizu' },
      { name: 'Masami Nagasawa', character: 'Miki Okudera' },
    ],
    streamingOn: ['Netflix'],
  },
];
