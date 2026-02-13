import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const envFilePath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');
config({ path: envFilePath });

const requiredMin32Secret = z.string().trim().min(32);

const optionalMin32Secret = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().min(32).optional(),
);

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  AUTH_SECRET: requiredMin32Secret,
  CORS_ORIGIN: z.string().optional(),        // comma-separated allowed origins for production
  PII_ENCRYPTION_KEY: optionalMin32Secret, // optional; falls back to AUTH_SECRET-derived key
  EMAIL_HASH_KEY: optionalMin32Secret, // optional; falls back to AUTH_SECRET when omitted
  ADMIN_USERNAMES: z.string().optional(), // optional; comma-separated usernames to force-admin
  OAUTH_GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  DAILY_RESET_TIMEZONE: z
    .string()
    .default('America/New_York')
    .refine((tz) => {
      try {
        // Throws RangeError for invalid IANA time zones.
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'Invalid DAILY_RESET_TIMEZONE (expected IANA timezone, e.g. America/Los_Angeles)'),
});

type Env = z.infer<typeof envSchema>;

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV === 'production' && !parsedEnv.CORS_ORIGIN) {
  throw new Error('FATAL: CORS_ORIGIN must be set in production');
}

export const env: Env = parsedEnv;
