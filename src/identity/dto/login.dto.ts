import z from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  // No length rules here: login only checks "does it match", and length hints
  // would tell an attacker about the password policy for nothing.
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;
