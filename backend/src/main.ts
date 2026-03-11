import 'reflect-metadata';
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envSchema } from './config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // Validate environment variables on boot
  envSchema.parse(process.env);

  const app = await NestFactory.create(AppModule);

  // Global error response standardization
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 3000;

  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
}

bootstrap();
