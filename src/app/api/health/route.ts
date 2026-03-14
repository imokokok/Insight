import { NextResponse } from 'next/server';
import { withVersionHeaders } from '@/lib/api/versioning';

export const dynamic = 'force-dynamic';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    };
    memory: {
      status: 'ok' | 'warning' | 'error';
      used: number;
      total: number;
      percentage: number;
    };
    environment: {
      status: 'ok' | 'error';
      nodeEnv: string;
      hasRequiredEnvVars: boolean;
    };
  };
}

async function checkDatabase(): Promise<HealthCheckResult['checks']['database']> {
  try {
    const { getSupabaseClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseClient();
    
    const start = Date.now();
    const { error } = await supabase.from('user_profiles').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      return { status: 'error', error: error.message };
    }

    return { status: 'ok', latency };
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function checkMemory(): HealthCheckResult['checks']['memory'] {
  const memUsage = process.memoryUsage();
  const used = memUsage.heapUsed;
  const total = memUsage.heapTotal;
  const percentage = (used / total) * 100;

  let status: 'ok' | 'warning' | 'error' = 'ok';
  if (percentage > 90) {
    status = 'error';
  } else if (percentage > 75) {
    status = 'warning';
  }

  return {
    status,
    used,
    total,
    percentage: Math.round(percentage * 100) / 100,
  };
}

function checkEnvironment(): HealthCheckResult['checks']['environment'] {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const hasRequiredEnvVars = requiredEnvVars.every(
    (envVar) => process.env[envVar] !== undefined
  );

  return {
    status: hasRequiredEnvVars ? 'ok' : 'error',
    nodeEnv: process.env.NODE_ENV || 'development',
    hasRequiredEnvVars,
  };
}

export async function GET() {
  const startTime = Date.now();
  
  const [database, environment] = await Promise.all([
    checkDatabase(),
    checkEnvironment(),
  ]);

  const memory = checkMemory();

  const checks = { database, memory, environment };

  const hasErrors = Object.values(checks).some(
    (check) => check.status === 'error'
  );
  const hasWarnings = Object.values(checks).some(
    (check) => check.status === 'warning'
  );

  let status: HealthCheckResult['status'] = 'healthy';
  if (hasErrors) {
    status = 'unhealthy';
  } else if (hasWarnings) {
    status = 'degraded';
  }

  const result: HealthCheckResult = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    uptime: process.uptime(),
    checks,
  };

  const response = NextResponse.json(result, {
    status: status === 'unhealthy' ? 503 : 200,
  });

  return withVersionHeaders(response);
}
