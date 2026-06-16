import { z } from 'zod';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('EnvConfig');

type Environment = 'development' | 'production' | 'test';

interface ClientSupabaseConfig {
  url: string;
  anonKey: string;
}

interface ServerSupabaseConfig extends ClientSupabaseConfig {
  serviceRoleKey?: string;
}

interface AppConfig {
  url: string | undefined;
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

interface ClientFeatureFlags {
  enableAnalytics: boolean;
  enablePerformanceMonitoring: boolean;
}

interface ServerFeatureFlags extends ClientFeatureFlags {
  useRealChainlinkData: boolean;
  useRealApi3Data: boolean;
  useRealTwapData: boolean;
  useRealReflectorData: boolean;
  useRealFlareData: boolean;
}

interface SecurityConfig {
  csrfSecret: string;
  jwtSecret: string;
  sessionTimeout: number;
  maxRequestSize: number;
  allowedOrigins: string[];
}

interface ClientEnvConfig {
  supabase: ClientSupabaseConfig;
  app: AppConfig;
  features: ClientFeatureFlags;
}

interface ServerEnvConfig extends ClientEnvConfig {
  supabase: ServerSupabaseConfig;
  features: ServerFeatureFlags;
  security: SecurityConfig;
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
  NEXT_PUBLIC_ENABLE_ANALYTICS: envBoolean,
  NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: envBoolean,
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
  NEXT_PUBLIC_ENABLE_ANALYTICS: envBoolean,
  NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: envBoolean,
  USE_REAL_CHAINLINK_DATA: envBoolean.default(true),
  USE_REAL_API3_DATA: envBoolean.default(true),
  USE_REAL_TWAP_DATA: envBoolean.default(true),
  USE_REAL_REFLECTOR_DATA: envBoolean.default(true),
  USE_REAL_FLARE_DATA: envBoolean.default(true),
  SESSION_TIMEOUT: z.coerce.number().optional().default(3600),
  MAX_REQUEST_SIZE: z.coerce.number().optional().default(1048576),
  ALLOWED_ORIGINS: z.string().optional().default('http://localhost:3000'),
});

// Lenient server variant: only the genuinely required secrets stay required;
// everything else falls back to safe defaults. STELLAR_RPC_URL and
// REFLECTOR_*_CONTRACT are intentionally NOT here — they are parsed and
// consumed by src/lib/config/serverEnv.ts (STELLAR_CONFIG).
const lenientServerEnvSchema = serverEnvSchema.extend({
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
});

type ClientEnv = z.infer<typeof clientEnvSchema>;
type ServerEnv = z.infer<typeof serverEnvSchema>;

function getRawClientEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING:
      process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
  };
}

function getRawServerEnv() {
  return {
    ...getRawClientEnv(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CSRF_SECRET: process.env.CSRF_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    USE_REAL_CHAINLINK_DATA: process.env.USE_REAL_CHAINLINK_DATA,
    USE_REAL_API3_DATA: process.env.USE_REAL_API3_DATA,
    USE_REAL_TWAP_DATA: process.env.USE_REAL_TWAP_DATA,
    USE_REAL_REFLECTOR_DATA: process.env.USE_REAL_REFLECTOR_DATA,
    USE_REAL_FLARE_DATA: process.env.USE_REAL_FLARE_DATA,
    SESSION_TIMEOUT: process.env.SESSION_TIMEOUT,
    MAX_REQUEST_SIZE: process.env.MAX_REQUEST_SIZE,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
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

function getAllowedOrigins(originsStr: string): string[] {
  if (!originsStr) {
    return [];
  }
  return originsStr.split(',').map((origin) => origin.trim());
}

function buildClientEnvConfig(parsed: ClientEnv): ClientEnvConfig {
  return {
    supabase: {
      url: parsed.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    app: {
      url: parsed.NEXT_PUBLIC_APP_URL,
      environment: getEnvironment(),
      isDevelopment: getEnvironment() === 'development',
      isProduction: getEnvironment() === 'production',
      isTest: getEnvironment() === 'test',
    },
    features: {
      enableAnalytics: parsed.NEXT_PUBLIC_ENABLE_ANALYTICS,
      enablePerformanceMonitoring: parsed.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
    },
  };
}

function buildServerEnvConfig(parsed: ServerEnv): ServerEnvConfig {
  return {
    supabase: {
      url: parsed.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY || undefined,
    },
    app: {
      url: parsed.NEXT_PUBLIC_APP_URL,
      environment: getEnvironment(),
      isDevelopment: getEnvironment() === 'development',
      isProduction: getEnvironment() === 'production',
      isTest: getEnvironment() === 'test',
    },
    features: {
      enableAnalytics: parsed.NEXT_PUBLIC_ENABLE_ANALYTICS,
      enablePerformanceMonitoring: parsed.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
      useRealChainlinkData: parsed.USE_REAL_CHAINLINK_DATA,
      useRealApi3Data: parsed.USE_REAL_API3_DATA,
      useRealTwapData: parsed.USE_REAL_TWAP_DATA,
      useRealReflectorData: parsed.USE_REAL_REFLECTOR_DATA,
      useRealFlareData: parsed.USE_REAL_FLARE_DATA,
    },
    security: {
      csrfSecret: parsed.CSRF_SECRET,
      jwtSecret: parsed.JWT_SECRET,
      sessionTimeout: parsed.SESSION_TIMEOUT,
      maxRequestSize: parsed.MAX_REQUEST_SIZE,
      allowedOrigins: getAllowedOrigins(parsed.ALLOWED_ORIGINS),
    },
  };
}

const _isClient = typeof window !== 'undefined';

const _clientParsedEnv = _isClient ? parseClientEnv() : null;
const _serverParsedEnv = !_isClient ? parseServerEnv() : null;

const _clientEnvConfig = _clientParsedEnv ? buildClientEnvConfig(_clientParsedEnv) : null;
const _serverEnvConfig = _serverParsedEnv ? buildServerEnvConfig(_serverParsedEnv) : null;

function getEnv(): ClientEnvConfig | ServerEnvConfig {
  if (_isClient) {
    return _clientEnvConfig!;
  }
  return _serverEnvConfig!;
}

export const env: ClientEnvConfig | ServerEnvConfig = getEnv();

export const FEATURE_FLAGS: ServerFeatureFlags = _serverEnvConfig
  ? _serverEnvConfig.features
  : {
      enableAnalytics: _clientParsedEnv?.NEXT_PUBLIC_ENABLE_ANALYTICS ?? false,
      enablePerformanceMonitoring:
        _clientParsedEnv?.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING ?? false,
      useRealChainlinkData: false,
      useRealApi3Data: false,
      useRealTwapData: false,
      useRealReflectorData: false,
      useRealFlareData: false,
    };
