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
  enableRealtime: boolean;
  enableAnalytics: boolean;
  enablePerformanceMonitoring: boolean;
  enableCSRFProtection: boolean;
  enableRateLimiting: boolean;
}

interface ServerFeatureFlags extends ClientFeatureFlags {
  useRealChainlinkData: boolean;
  useRealApi3Data: boolean;
  useRealWinklinkData: boolean;
  useRealSupraData: boolean;
  useRealTwapData: boolean;
  useRealReflectorData: boolean;
  useRealFlareData: boolean;
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

interface ClientEnvConfig {
  supabase: ClientSupabaseConfig;
  app: AppConfig;
  features: ClientFeatureFlags;
  websocket: WebSocketConfig;
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
  NEXT_PUBLIC_WS_URL: z.string().optional(),
  NEXT_PUBLIC_ENABLE_REALTIME: envBoolean,
  NEXT_PUBLIC_ENABLE_ANALYTICS: envBoolean,
  NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: envBoolean,
  NEXT_PUBLIC_ENABLE_CSRF: envBoolean,
  NEXT_PUBLIC_ENABLE_RATE_LIMITING: envBoolean,
});

const lenientClientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_APP_URL: z.string().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_WS_URL: z.string().optional().default(''),
  NEXT_PUBLIC_ENABLE_REALTIME: envBoolean,
  NEXT_PUBLIC_ENABLE_ANALYTICS: envBoolean,
  NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: envBoolean,
  NEXT_PUBLIC_ENABLE_CSRF: envBoolean,
  NEXT_PUBLIC_ENABLE_RATE_LIMITING: envBoolean,
});

const serverEnvSchema = z.object({
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
  USE_REAL_TWAP_DATA: envBoolean.default(true),
  USE_REAL_REFLECTOR_DATA: envBoolean.default(true),
  USE_REAL_FLARE_DATA: envBoolean.default(true),
  STELLAR_RPC_URL: z.string().url().optional().default(''),
  REFLECTOR_CRYPTO_CONTRACT: z.string().optional().default(''),
  REFLECTOR_FOREX_CONTRACT: z.string().optional().default(''),
  SESSION_TIMEOUT: z.coerce.number().optional().default(3600),
  MAX_REQUEST_SIZE: z.coerce.number().optional().default(1048576),
  ALLOWED_ORIGINS: z.string().optional().default(''),
});

const lenientServerEnvSchema = z.object({
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
  USE_REAL_TWAP_DATA: envBoolean.default(true),
  USE_REAL_REFLECTOR_DATA: envBoolean.default(true),
  USE_REAL_FLARE_DATA: envBoolean.default(true),
  STELLAR_RPC_URL: z.string().optional().default(''),
  REFLECTOR_CRYPTO_CONTRACT: z.string().optional().default(''),
  REFLECTOR_FOREX_CONTRACT: z.string().optional().default(''),
  SESSION_TIMEOUT: z.coerce.number().optional().default(3600),
  MAX_REQUEST_SIZE: z.coerce.number().optional().default(1048576),
  ALLOWED_ORIGINS: z.string().optional().default(''),
});

type ClientEnv = z.infer<typeof clientEnvSchema>;
type ServerEnv = z.infer<typeof serverEnvSchema>;

function getRawClientEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_ENABLE_REALTIME: process.env.NEXT_PUBLIC_ENABLE_REALTIME,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING:
      process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
    NEXT_PUBLIC_ENABLE_CSRF: process.env.NEXT_PUBLIC_ENABLE_CSRF,
    NEXT_PUBLIC_ENABLE_RATE_LIMITING: process.env.NEXT_PUBLIC_ENABLE_RATE_LIMITING,
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
    USE_REAL_WINKLINK_DATA: process.env.USE_REAL_WINKLINK_DATA,
    USE_REAL_SUPRA_DATA: process.env.USE_REAL_SUPRA_DATA,
    USE_REAL_TWAP_DATA: process.env.USE_REAL_TWAP_DATA,
    USE_REAL_REFLECTOR_DATA: process.env.USE_REAL_REFLECTOR_DATA,
    USE_REAL_FLARE_DATA: process.env.USE_REAL_FLARE_DATA,
    STELLAR_RPC_URL: process.env.STELLAR_RPC_URL,
    REFLECTOR_CRYPTO_CONTRACT: process.env.REFLECTOR_CRYPTO_CONTRACT,
    REFLECTOR_FOREX_CONTRACT: process.env.REFLECTOR_FOREX_CONTRACT,
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
      USE_REAL_TWAP_DATA: data.USE_REAL_TWAP_DATA,
      USE_REAL_REFLECTOR_DATA: data.USE_REAL_REFLECTOR_DATA,
      USE_REAL_FLARE_DATA: data.USE_REAL_FLARE_DATA,
      STELLAR_RPC_URL: data.STELLAR_RPC_URL,
      REFLECTOR_CRYPTO_CONTRACT: data.REFLECTOR_CRYPTO_CONTRACT,
      REFLECTOR_FOREX_CONTRACT: data.REFLECTOR_FOREX_CONTRACT,
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
      enableRealtime: parsed.NEXT_PUBLIC_ENABLE_REALTIME,
      enableAnalytics: parsed.NEXT_PUBLIC_ENABLE_ANALYTICS,
      enablePerformanceMonitoring: parsed.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
      enableCSRFProtection: parsed.NEXT_PUBLIC_ENABLE_CSRF,
      enableRateLimiting: parsed.NEXT_PUBLIC_ENABLE_RATE_LIMITING,
    },
    websocket: {
      url: parsed.NEXT_PUBLIC_WS_URL || undefined,
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
      enableRealtime: parsed.NEXT_PUBLIC_ENABLE_REALTIME,
      enableAnalytics: parsed.NEXT_PUBLIC_ENABLE_ANALYTICS,
      enablePerformanceMonitoring: parsed.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
      enableCSRFProtection: parsed.NEXT_PUBLIC_ENABLE_CSRF,
      enableRateLimiting: parsed.NEXT_PUBLIC_ENABLE_RATE_LIMITING,
      useRealChainlinkData: parsed.USE_REAL_CHAINLINK_DATA,
      useRealApi3Data: parsed.USE_REAL_API3_DATA,
      useRealWinklinkData: parsed.USE_REAL_WINKLINK_DATA,
      useRealSupraData: parsed.USE_REAL_SUPRA_DATA,
      useRealTwapData: parsed.USE_REAL_TWAP_DATA,
      useRealReflectorData: parsed.USE_REAL_REFLECTOR_DATA,
      useRealFlareData: parsed.USE_REAL_FLARE_DATA,
    },
    websocket: {
      url: parsed.NEXT_PUBLIC_WS_URL || undefined,
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

export function getEnv(): ClientEnvConfig | ServerEnvConfig {
  if (_isClient) {
    return _clientEnvConfig!;
  }
  return _serverEnvConfig!;
}

export const env: ClientEnvConfig | ServerEnvConfig = getEnv();

export const FEATURE_FLAGS: ServerFeatureFlags = _serverEnvConfig
  ? _serverEnvConfig.features
  : {
      enableRealtime: _clientParsedEnv?.NEXT_PUBLIC_ENABLE_REALTIME ?? false,
      enableAnalytics: _clientParsedEnv?.NEXT_PUBLIC_ENABLE_ANALYTICS ?? false,
      enablePerformanceMonitoring:
        _clientParsedEnv?.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING ?? false,
      enableCSRFProtection: _clientParsedEnv?.NEXT_PUBLIC_ENABLE_CSRF ?? false,
      enableRateLimiting: _clientParsedEnv?.NEXT_PUBLIC_ENABLE_RATE_LIMITING ?? false,
      useRealChainlinkData: false,
      useRealApi3Data: false,
      useRealWinklinkData: false,
      useRealSupraData: false,
      useRealTwapData: false,
      useRealReflectorData: false,
      useRealFlareData: false,
    };

export function isFeatureEnabled(feature: keyof ServerFeatureFlags): boolean {
  return FEATURE_FLAGS[feature];
}

export function getSupabaseConfig(): ServerSupabaseConfig {
  if (_serverEnvConfig) {
    return _serverEnvConfig.supabase;
  }
  return {
    url: _clientParsedEnv?.NEXT_PUBLIC_SUPABASE_URL ?? '',
    anonKey: _clientParsedEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: undefined,
  };
}

export function getAppConfig(): AppConfig {
  return env.app;
}

export function getWebSocketConfig(): WebSocketConfig {
  return env.websocket;
}

export function getSecurityConfig(): SecurityConfig {
  if (_serverEnvConfig) {
    return _serverEnvConfig.security;
  }
  return {
    csrfSecret: '',
    jwtSecret: '',
    sessionTimeout: 3600,
    maxRequestSize: 1048576,
    allowedOrigins: [],
  };
}

export function validateEnvironment(): { valid: boolean; errors: string[] } {
  if (_isClient) {
    return { valid: true, errors: [] };
  }

  const raw = getRawServerEnv();
  const result = serverEnvSchema.safeParse(raw);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);

  if (errors.length > 0) {
    logger.error('Environment validation failed', undefined, { errors });
  }

  return { valid: false, errors };
}

export { clientEnvSchema, lenientClientEnvSchema, serverEnvSchema, lenientServerEnvSchema };

export type {
  ClientEnv,
  ServerEnv,
  ClientEnvConfig,
  ServerEnvConfig,
  ClientSupabaseConfig,
  ServerSupabaseConfig,
  AppConfig,
  ClientFeatureFlags,
  ServerFeatureFlags,
  WebSocketConfig,
  SecurityConfig,
  Environment,
};
