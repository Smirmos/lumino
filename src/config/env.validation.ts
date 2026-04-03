import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

const REQUIRED_VARS = ['DATABASE_URL', 'REDIS_URL', 'ANTHROPIC_API_KEY', 'PORT'];
const OPTIONAL_VARS = ['META_APP_SECRET', 'DIALOG360_WEBHOOK_SECRET', 'SENTRY_DSN', 'SENDGRID_API_KEY'];

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of OPTIONAL_VARS) {
    if (!process.env[key]) {
      logger.warn(`Optional env var ${key} is not set`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
