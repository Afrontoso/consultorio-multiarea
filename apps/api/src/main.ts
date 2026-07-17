import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { corsOrigins, validateEnv } from './config/env';

async function bootstrap() {
  const env = validateEnv(process.env);

  const app = await NestFactory.create(AppModule);
  // Solta a porta e fecha o Prisma (onModuleDestroy) em SIGTERM/SIGINT —
  // sem isso o `nest --watch` recompila e o processo novo morre com EADDRINUSE.
  app.enableShutdownHooks();
  app.use(helmet());
  app.enableCors({
    origin: corsOrigins(env),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Tenant-Slug'],
  });
  app.setGlobalPrefix('v1');
  await app.listen(env.PORT);
  console.log(`[api] listening on http://localhost:${env.PORT}`);
}

void bootstrap();
