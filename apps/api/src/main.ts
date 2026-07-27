import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { corsOrigins, validateEnv } from './config/env';

async function bootstrap() {
  const env = validateEnv(process.env);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Atrás do proxy do Fly, o IP de origem chega em X-Forwarded-For. Sem isto o
  // rate limit vê o IP do proxy em todos os requests: um único balde para o
  // mundo inteiro — inútil contra abuso e injusto com quem é legítimo.
  // `1` = confia só no primeiro salto (o nosso proxy), então o cliente não
  // consegue forjar o próprio IP empilhando cabeçalhos.
  app.set('trust proxy', 1);
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
