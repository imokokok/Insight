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

function validateEnvVar(name: string, value: string | undefined, required = true): string {
  if (!value) {
    if (required && getEnvironment() === 'production') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    if (!required) {
      return '';
    }
    logger.warn(`Missing environment variable: ${name}, using fallback`);
    return '';
  }
  return value;
}

function validateUrl(name: string, value: string | undefined, required = true): string {
  const validated = validateEnvVar(name, value, required);
  if (validated) {
    try {
      new URL(validated);
    } catch {
      if (getEnvironment() === 'production') {
        throw new Error(`Invalid URL in environment variable: ${name}`);
      }
      logger.warn(`Invalid URL in environment variable: ${name}`);
    }
  }
  return validated;
}

function getAllowedOrigins(): string[] {
  const origins = process.env.ALLOWED_ORIGINS;
  if (!origins) {
    return [];
  }
  return origins.split(',').map((origin) => origin.trim());
}

function generateFallbackSecret(): string {
  if (getEnvironment() === 'production') {
    throw new Error('SECURITY_SECRET must be set in production environment');
  }
  logger.warn('Using fallback security secret - DO NOT USE IN PRODUCTION');
  return 'fallback-secret-do-not-use-in-production-' + Date.now();
}

export const env: EnvConfig = {
  supabase: {
    url: validateUrl('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: validateEnvVar(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    serviceRoleKey: validateEnvVar(
      'SUPABASE_SERVICE_ROLE_KEY',
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      false
    ),
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL,
    environment: getEnvironment(),
    isDevelopment: getEnvironment() === 'development',
    isProduction: getEnvironment() === 'production',
    isTest: getEnvironment() === 'test',
  },
  features: {
    enableRealtime: process.env.NEXT_PUBLIC_ENABLE_REALTIME !== 'false',
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enablePerformanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
    enableCSRFProtection: process.env.NEXT_PUBLIC_ENABLE_CSRF !== 'false',
    enableRateLimiting: process.env.NEXT_PUBLIC_ENABLE_RATE_LIMITING !== 'false',
  },
  websocket: {
    url: process.env.NEXT_PUBLIC_WS_URL,
  },
  security: {
    csrfSecret: process.env.CSRF_SECRET || generateFallbackSecret(),
    jwtSecret: process.env.JWT_SECRET || generateFallbackSecret(),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600', 10),
    maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '1048576', 10),
    allowedOrigins: getAllowedOrigins(),
  },
};

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
  const errors: string[] = [];

  if (!env.supabase.url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  if (!env.supabase.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  if (env.app.isProduction) {
    if (!env.supabase.serviceRoleKey) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY is required in production');
    }

    if (env.security.csrfSecret.includes('fallback')) {
      errors.push('CSRF_SECRET must be set in production');
    }

    if (env.security.jwtSecret.includes('fallback')) {
      errors.push('JWT_SECRET must be set in production');
    }

    if (!env.app.url) {
      errors.push('NEXT_PUBLIC_APP_URL is required in production');
    }

    if (env.security.allowedOrigins.length === 0) {
      errors.push('ALLOWED_ORIGINS is recommended in production');
    }
  }

  if (errors.length > 0) {
    logger.error('Environment validation failed', { errors });
  }

  return { valid: errors.length === 0, errors };
}

export type {
  EnvConfig,
  SupabaseConfig,
  AppConfig,
  FeatureFlags,
  Environment,
  WebSocketConfig,
  SecurityConfig,
};
