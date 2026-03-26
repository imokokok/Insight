import { InternalError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('EnvConfig');

type Environment = 'development' | 'production' | 'test';

interface SupabaseConfig {
  url: string;
  anonKey: string;
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
}

interface WebSocketConfig {
  url: string | undefined;
}

interface EnvConfig {
  supabase: SupabaseConfig;
  app: AppConfig;
  features: FeatureFlags;
  websocket: WebSocketConfig;
}

function getEnvironment(): Environment {
  return (process.env.NODE_ENV as Environment) || 'development';
}

function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new InternalError(`Missing required environment variable: ${name}`, {
        operation: 'validateEnvVar',
      });
    }
    logger.warn(`Missing environment variable: ${name}, using fallback`);
    return '';
  }
  return value;
}

export const env: EnvConfig = {
  supabase: {
    url: validateEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: validateEnvVar(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
  },
  websocket: {
    url: process.env.NEXT_PUBLIC_WS_URL,
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

export type { EnvConfig, SupabaseConfig, AppConfig, FeatureFlags, Environment, WebSocketConfig };
