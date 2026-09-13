import { z } from 'zod';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('EnvConfig');

type Environment = 'development' | 'production' | 'test';

interface ServerFeatureFlags {
  useRealChainlinkData: boolean;
}

function getEnvironment(): Environment {
  return (process.env.NODE_ENV as Environment) || 'development';
}

const envBoolean = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1')
  .default(false);

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
});

// Lenient variants: in non-production, fall back to safe defaults per-field
// instead of maintaining a full duplicate schema.
const lenientClientEnvSchema = clientEnvSchema.extend({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
});

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  CSRF_SECRET: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  USE_REAL_CHAINLINK_DATA: envBoolean.default(true),
  MAX_REQUEST_SIZE: z.coerce.number().optional().default(1048576),
});

// Lenient server variant: only the genuinely required secrets stay required;
// everything else falls back to safe defaults. Reflector endpoints and
// contracts are intentionally fixed in reflectorConstants.ts.
const lenientServerEnvSchema = serverEnvSchema.extend({
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default('dev-service-role-key'),
  CSRF_SECRET: z.string().optional().default('dev-csrf-secret'),
  JWT_SECRET: z.string().optional().default('dev-jwt-secret'),
});

type ClientEnv = z.infer<typeof clientEnvSchema>;
type ServerEnv = z.infer<typeof serverEnvSchema>;

function getRawClientEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
}

function getRawServerEnv() {
  return {
    ...getRawClientEnv(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CSRF_SECRET: process.env.CSRF_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    USE_REAL_CHAINLINK_DATA: process.env.USE_REAL_CHAINLINK_DATA,
    MAX_REQUEST_SIZE: process.env.MAX_REQUEST_SIZE,
  };
}

function parseClientEnv(): ClientEnv {
  const raw = getRawClientEnv();
  const result = clientEnvSchema.safeParse(raw);

  if (result.success) {
    return result.data;
  }

  const allErrors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);

  if (getEnvironment() === 'production') {
    throw new Error(`Client environment validation failed:\n${allErrors.join('\n')}`);
  }

  logger.warn('Client environment validation warnings:', { errors: allErrors });

  return lenientClientEnvSchema.parse(raw);
}

function parseServerEnv(): ServerEnv {
  const raw = getRawServerEnv();
  const result = serverEnvSchema.safeParse(raw);

  if (result.success) {
    return result.data;
  }

  const allErrors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);

  if (getEnvironment() === 'production') {
    throw new Error(`Environment validation failed:\n${allErrors.join('\n')}`);
  }

  logger.warn('Environment validation warnings:', { errors: allErrors });

  return lenientServerEnvSchema.parse(raw);
}

const _isClient = typeof window !== 'undefined';

if (_isClient) parseClientEnv();
const _serverParsedEnv = !_isClient ? parseServerEnv() : null;

// The factory only has one real-data switch. Other providers always use their
// production data source, so exposing switches for them implied behavior that
// their clients never implemented.
export const FEATURE_FLAGS: ServerFeatureFlags = {
  useRealChainlinkData: _serverParsedEnv?.USE_REAL_CHAINLINK_DATA ?? false,
};
