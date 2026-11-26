import z from 'zod';

export const registerSchema = z.object({
  // Normalised here so "Palm@Mail.com" and "palm@mail.com" are the same Member.
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(40),
});

export type RegisterDto = z.infer<typeof registerSchema>;
