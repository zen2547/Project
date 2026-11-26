import z from 'zod';
import { httpsUrlSchema } from '../../../common/https-url.schema.js';

const name = z.string().trim().min(1).max(50);

export const createStreamingServiceSchema = z.object({
  name,
  logoUrl: httpsUrlSchema.optional(),
});
export type CreateStreamingServiceDto = z.infer<
  typeof createStreamingServiceSchema
>;

// PATCH is partial. `logoUrl: null` removes the logo; leaving a field out
// keeps it as it is. An empty body changes nothing, so it is a 400.
export const updateStreamingServiceSchema = z
  .object({
    name: name.optional(),
    logoUrl: httpsUrlSchema.nullable().optional(),
  })
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    message: 'Send at least one of: name, logoUrl',
  });
export type UpdateStreamingServiceDto = z.infer<
  typeof updateStreamingServiceSchema
>;
