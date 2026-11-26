import z from 'zod';

// Route ids arrive as strings ("/genres/7"); coerce and reject 0, -1, "abc", 1.5.
// Use as @Param('id', { schema: idParamSchema }) id: number
export const idParamSchema = z.coerce.number().int().positive();
