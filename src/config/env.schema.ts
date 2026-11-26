import z from 'zod';

// Validated once at startup by ConfigModule. A missing or malformed
// variable stops the app before it serves a single request.
export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.coerce.number().int().positive(),
});

export type Env = z.infer<typeof envSchema>;
