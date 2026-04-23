import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from '@core/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get(LoggerService);

  // Enable CORS
  const corsOrigins: (string | RegExp)[] = [
    'http://localhost:5173',
    'http://localhost:3001',
  ];
  if (process.env.ADMIN_URL) corsOrigins.push(process.env.ADMIN_URL);
  if (process.env.PUBLIC_URL) corsOrigins.push(process.env.PUBLIC_URL);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v2');

  // Listen
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Server running on http://localhost:${port}/api/v2`);
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap application:', error);
  process.exit(1);
});
