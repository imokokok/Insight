import { type NextRequest, NextResponse } from 'next/server';

import { withVersionHeaders } from '@/lib/api/versioning';

export const dynamic = 'force-dynamic';

function isLocalRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: 'ok' | 'error';
    memory: 'ok' | 'warning' | 'error';
    environment: 'ok' | 'error';
  };
}

async function checkDatabase(): Promise<'ok' | 'error'> {
  try {
    const { getSupabaseClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseClient();

    const { error } = await supabase.from('user_profiles').select('id').limit(1);

    if (error) {
      return 'error';
    }

    return 'ok';
  } catch {
    return 'error';
  }
}

function checkMemory(): 'ok' | 'warning' | 'error' {
  const memUsage = process.memoryUsage();
  const used = memUsage.heapUsed;
  const total = memUsage.heapTotal;
  const percentage = (used / total) * 100;

  if (percentage > 90) {
    return 'error';
  } else if (percentage > 75) {
    return 'warning';
  }

  return 'ok';
}

function checkEnvironment(): 'ok' | 'error' {
  const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  const hasRequiredEnvVars = requiredEnvVars.every((envVar) => process.env[envVar] !== undefined);

  return hasRequiredEnvVars ? 'ok' : 'error';
}

export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [database, environment] = await Promise.all([checkDatabase(), checkEnvironment()]);

  const memory = checkMemory();

  const checks = { database, memory, environment };

  const hasErrors = Object.values(checks).some((check) => check === 'error');
  const hasWarnings = memory === 'warning';

  let status: HealthCheckResult['status'] = 'healthy';
  if (hasErrors) {
    status = 'unhealthy';
  } else if (hasWarnings) {
    status = 'degraded';
  }

  const result: HealthCheckResult = {
    status,
    timestamp: new Date().toISOString(),
    checks,
  };

  const response = NextResponse.json(result, {
    status: status === 'unhealthy' ? 503 : 200,
  });

  return withVersionHeaders(response);
}
