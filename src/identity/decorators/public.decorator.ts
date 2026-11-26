import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

// Every route needs a JWT by default (global AuthGuard). Mark the exceptions with @Public().
export const Public = () => SetMetadata(IS_PUBLIC, true);
