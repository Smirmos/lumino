import './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import * as bodyParser from 'body-parser';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  const pool = new Pool({ connectionString });
  try {
    const db = drizzle(pool);
    console.log('Running DB migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed');
  } catch (err) {
    console.error('Migration failed (non-fatal):', err);
  } finally {
    await pool.end();
  }
}

async function bootstrap() {
  await runMigrations();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Store raw body for webhook signature verification
  app.use(bodyParser.json({
    verify: (req: any, _res: any, buf: Buffer) => {
      req.rawBody = buf;
    },
  }));

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new SentryExceptionFilter());
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`Lumino chatbot running on port ${port}`);
}
bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
