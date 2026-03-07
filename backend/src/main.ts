import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envSchema } from './config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  // Validate environment variables on boot
  envSchema.parse(process.env);

  const app = await NestFactory.create(AppModule);

  // Global error response standardization
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 3000;

  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
