import z from 'zod';

// Same body for create (POST) and rename (PATCH): a Keyword has only a name.
export const keywordSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export type KeywordDto = z.infer<typeof keywordSchema>;
