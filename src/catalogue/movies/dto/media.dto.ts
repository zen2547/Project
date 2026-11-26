import z from 'zod';
import { httpsUrlSchema } from '../../../common/https-url.schema.js';

// https on youtube.com (www./m.) or youtu.be only, so the frontend can embed it.
// The anchored regex stops look-alikes such as youtube.com.evil.com.
export const youtubeUrlSchema = z
  .url({
    protocol: /^https$/,
    hostname: /^((www|m)\.)?youtube\.com$|^youtu\.be$/,
    error: 'youtubeUrl must be an https link on youtube.com or youtu.be',
  })
  .max(2048);

export const createTrailerSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  youtubeUrl: youtubeUrlSchema,
});
export type CreateTrailerDto = z.infer<typeof createTrailerSchema>;

export const createPhotoSchema = z.strictObject({
  url: httpsUrlSchema,
  caption: z.string().trim().min(1).max(300).optional(),
});
export type CreatePhotoDto = z.infer<typeof createPhotoSchema>;

// PUT /movies/:movieId/streaming-links/:serviceId — the URL to watch it there.
export const streamingLinkSchema = z.strictObject({ url: httpsUrlSchema });
export type StreamingLinkDto = z.infer<typeof streamingLinkSchema>;
