import z from 'zod';

// Same body for create (POST) and rename (PATCH): a Genre has only a name.
export const genreSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export type GenreDto = z.infer<typeof genreSchema>;
