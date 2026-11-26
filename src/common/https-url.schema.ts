import z from 'zod';

// Every URL we store (logos, posters, photos) must be https: no http, no
// javascript:, no data:. Max length keeps one field from holding megabytes.
export const httpsUrlSchema = z.url({ protocol: /^https$/ }).max(2048);
