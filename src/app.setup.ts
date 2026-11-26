import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';

// App-wide setup that is not a provider. main.ts and the e2e helper both call
// this, so tests run against exactly the same pipeline as the real server.
export function configureApp(app: INestApplication): INestApplication {
  // Validates any @Body/@Param/@Query that declares a Zod `schema`.
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();
  return app;
}
