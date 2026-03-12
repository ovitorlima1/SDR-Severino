import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MainModule } from './main.module';
import { HttpExceptionFilter } from './modules/@common/application/exceptions/filter/http-exception.filter';
import { HttpLoggingInterceptor } from './modules/@common/application/interceptors/http-logging.interceptor';
import { setupSwagger } from './modules/@common/application/config/swagger.config';

// Timezone Brazil
process.env.TZ = 'America/Sao_Paulo';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(MainModule);

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  // CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://sdr-severino.vercel.app'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Swagger
  setupSwagger(app);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 SDR Severino Backend running on http://localhost:${port}`);
  logger.log(`📚 Swagger UI: http://localhost:${port}/api-doc`);
}

bootstrap();
