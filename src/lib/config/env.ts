import { z } from 'zod';

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('EnvConfig');

type Environment = 'development' | 'production' | 'test';

interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

interface AppConfig {
  url: string | undefined;
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

interface FeatureFlags {
  enableRealtime: boolean;
  enableAnalytics: boolean;
  enablePerformanceMonitoring: boolean;
  enableCSRFProtection: boolean;
  enableRateLimiting: boolean;
  useRealChainlinkData: boolean;
  useRealApi3Data: boolean;
  useRealWinklinkData: boolean;
  useRealSupraData: boolean;
}

interface WebSocketConfig {
  url: string | undefined;
}

interface SecurityConfig {
  csrfSecret: string;
  jwtSecret: string;
  sessionTimeout: number;
  maxRequestSize: number;
  allowedOrigins: string[];
}

interface EnvConfig {
  supabase: SupabaseConfig;
  app: AppConfig;
  features: FeatureFlags;
  websocket: WebSocketConfig;
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

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_WS_URL: z.string().optional(),
  CSRF_SECRET: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  NEXT_PUBLIC_ENABLE_REALTIME: envBoolean,
  NEXT_PUBLIC_ENABLE_ANALYTICS: envBoolean,
  NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: envBoolean,
  NEXT_PUBLIC_ENABLE_CSRF: envBoolean,
  NEXT_PUBLIC_ENABLE_RATE_LIMITING: envBoolean,
  USE_REAL_CHAINLINK_DATA: envBoolean.default(true),
  USE_REAL_API3_DATA: envBoolean.default(true),
  USE_REAL_WINKLINK_DATA: envBoolean.default(true),
  USE_REAL_SUPRA_DATA: envBoolean.default(true),
  SESSION_TIMEOUT: z.coerce.number().optional().default(3600),
  MAX_REQUEST_SIZE: z.coerce.number().optional().default(1048576),
  ALLOWED_ORIGINS: z.string().optional().default(''),
});

const lenientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_APP_URL: z.string().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_WS_URL: z.string().optional().default(''),
  CSRF_SECRET: z.string().optional().default(''),
  JWT_SECRET: z.string().optional().default(''),
  NEXT_PUBLIC_ENABLE_REALTIME: envBoolean,
  NEXT_PUBLIC_ENABLE_ANALYTICS: envBoolean,
  NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: envBoolean,
  NEXT_PUBLIC_ENABLE_CSRF: envBoolean,
  NEXT_PUBLIC_ENABLE_RATE_LIMITING: envBoolean,
  USE_REAL_CHAINLINK_DATA: envBoolean.default(true),
  USE_REAL_API3_DATA: envBoolean.default(true),
  USE_REAL_WINKLINK_DATA: envBoolean.default(true),
  USE_REAL_SUPRA_DATA: envBoolean.default(true),
  SESSION_TIMEOUT: z.coerce.number().optional().default(3600),
  MAX_REQUEST_SIZE: z.coerce.number().optional().default(1048576),
  ALLOWED_ORIGINS: z.string().optional().default(''),
});

interface ParsedEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_WS_URL: string;
  CSRF_SECRET: string;
  JWT_SECRET: string;
  NEXT_PUBLIC_ENABLE_REALTIME: boolean;
  NEXT_PUBLIC_ENABLE_ANALYTICS: boolean;
  NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: boolean;
  NEXT_PUBLIC_ENABLE_CSRF: boolean;
  NEXT_PUBLIC_ENABLE_RATE_LIMITING: boolean;
  USE_REAL_CHAINLINK_DATA: boolean;
  USE_REAL_API3_DATA: boolean;
  USE_REAL_WINKLINK_DATA: boolean;
  USE_REAL_SUPRA_DATA: boolean;
  SESSION_TIMEOUT: number;
  MAX_REQUEST_SIZE: number;
  ALLOWED_ORIGINS: string;
}

function getRawEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    CSRF_SECRET: process.env.CSRF_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_ENABLE_REALTIME: process.env.NEXT_PUBLIC_ENABLE_REALTIME,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING:
      process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
    NEXT_PUBLIC_ENABLE_CSRF: process.env.NEXT_PUBLIC_ENABLE_CSRF,
    NEXT_PUBLIC_ENABLE_RATE_LIMITING: process.env.NEXT_PUBLIC_ENABLE_RATE_LIMITING,
    USE_REAL_CHAINLINK_DATA: process.env.USE_REAL_CHAINLINK_DATA,
    USE_REAL_API3_DATA: process.env.USE_REAL_API3_DATA,
    USE_REAL_WINKLINK_DATA: process.env.USE_REAL_WINKLINK_DATA,
    USE_REAL_SUPRA_DATA: process.env.USE_REAL_SUPRA_DATA,
    SESSION_TIMEOUT: process.env.SESSION_TIMEOUT,
    MAX_REQUEST_SIZE: process.env.MAX_REQUEST_SIZE,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  };
}

function parseEnv(): ParsedEnv {
  const isClient = typeof window !== 'undefined';
  const raw = getRawEnv();

  if (isClient) {
    return lenientEnvSchema.parse(raw) as ParsedEnv;
  }

  const result = envSchema.safeParse(raw);

  if (result.success) {
    const data = result.data;
    return {
      NEXT_PUBLIC_SUPABASE_URL: data.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: data.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_APP_URL: data.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_WS_URL: data.NEXT_PUBLIC_WS_URL ?? '',
      CSRF_SECRET: data.CSRF_SECRET,
      JWT_SECRET: data.JWT_SECRET,
      NEXT_PUBLIC_ENABLE_REALTIME: data.NEXT_PUBLIC_ENABLE_REALTIME,
      NEXT_PUBLIC_ENABLE_ANALYTICS: data.NEXT_PUBLIC_ENABLE_ANALYTICS,
      NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: data.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
      NEXT_PUBLIC_ENABLE_CSRF: data.NEXT_PUBLIC_ENABLE_CSRF,
      NEXT_PUBLIC_ENABLE_RATE_LIMITING: data.NEXT_PUBLIC_ENABLE_RATE_LIMITING,
      USE_REAL_CHAINLINK_DATA: data.USE_REAL_CHAINLINK_DATA,
      USE_REAL_API3_DATA: data.USE_REAL_API3_DATA,
      USE_REAL_WINKLINK_DATA: data.USE_REAL_WINKLINK_DATA,
      USE_REAL_SUPRA_DATA: data.USE_REAL_SUPRA_DATA,
      SESSION_TIMEOUT: data.SESSION_TIMEOUT,
      MAX_REQUEST_SIZE: data.MAX_REQUEST_SIZE,
      ALLOWED_ORIGINS: data.ALLOWED_ORIGINS,
    };
  }

  const allErrors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);

  if (getEnvironment() === 'production') {
    throw new Error(`Environment validation failed:\n${allErrors.join('\n')}`);
  }

  logger.warn('Environment validation warnings:', { errors: allErrors });

  return lenientEnvSchema.parse(raw) as ParsedEnv;
}

function getAllowedOrigins(originsStr: string): string[] {
  if (!originsStr) {
    return [];
  }
  return originsStr.split(',').map((origin) => origin.trim());
}

const parsedEnv = parseEnv();

export const env: EnvConfig = {
  supabase: {
    url: parsedEnv.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: parsedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: parsedEnv.SUPABASE_SERVICE_ROLE_KEY || undefined,
  },
  app: {
    url: parsedEnv.NEXT_PUBLIC_APP_URL,
    environment: getEnvironment(),
    isDevelopment: getEnvironment() === 'development',
    isProduction: getEnvironment() === 'production',
    isTest: getEnvironment() === 'test',
  },
  features: {
    enableRealtime: parsedEnv.NEXT_PUBLIC_ENABLE_REALTIME,
    enableAnalytics: parsedEnv.NEXT_PUBLIC_ENABLE_ANALYTICS,
    enablePerformanceMonitoring: parsedEnv.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
    enableCSRFProtection: parsedEnv.NEXT_PUBLIC_ENABLE_CSRF,
    enableRateLimiting: parsedEnv.NEXT_PUBLIC_ENABLE_RATE_LIMITING,
    useRealChainlinkData: parsedEnv.USE_REAL_CHAINLINK_DATA,
    useRealApi3Data: parsedEnv.USE_REAL_API3_DATA,
    useRealWinklinkData: parsedEnv.USE_REAL_WINKLINK_DATA,
    useRealSupraData: parsedEnv.USE_REAL_SUPRA_DATA,
  },
  websocket: {
    url: parsedEnv.NEXT_PUBLIC_WS_URL || undefined,
  },
  security: {
    csrfSecret: parsedEnv.CSRF_SECRET,
    jwtSecret: parsedEnv.JWT_SECRET,
    sessionTimeout: parsedEnv.SESSION_TIMEOUT,
    maxRequestSize: parsedEnv.MAX_REQUEST_SIZE,
    allowedOrigins: getAllowedOrigins(parsedEnv.ALLOWED_ORIGINS),
  },
};

export const FEATURE_FLAGS: FeatureFlags = env.features;

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return env.features[feature];
}

export function getSupabaseConfig(): SupabaseConfig {
  return env.supabase;
}

export function getAppConfig(): AppConfig {
  return env.app;
}

export function getWebSocketConfig(): WebSocketConfig {
  return env.websocket;
}

export function getSecurityConfig(): SecurityConfig {
  return env.security;
}

export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const isClient = typeof window !== 'undefined';
  const raw = getRawEnv();

  if (isClient) {
    return { valid: true, errors: [] };
  }

  const result = envSchema.safeParse(raw);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);

  if (errors.length > 0) {
    logger.error('Environment validation failed', undefined, { errors });
  }

  return { valid: false, errors };
}

export { envSchema, lenientEnvSchema };

export type {
  EnvConfig,
  SupabaseConfig,
  AppConfig,
  FeatureFlags,
  Environment,
  WebSocketConfig,
  SecurityConfig,
};
