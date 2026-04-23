import { type NextRequest, NextResponse } from 'next/server';

import { ApiResponseBuilder } from '@/lib/api/response';
import { withVersionHeaders } from '@/lib/api/versioning';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function isLocalRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') {
    const authHeader = request.headers.get('authorization');
    const healthSecret = process.env.HEALTH_CHECK_SECRET;
    if (healthSecret && authHeader === `Bearer ${healthSecret}`) {
      return true;
    }
    return false;
  }
  const authHeader = request.headers.get('authorization');
  const healthSecret = process.env.HEALTH_CHECK_SECRET;
  if (healthSecret && authHeader === `Bearer ${healthSecret}`) {
    return true;
  }
  return false;
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
    const supabase = createServerClient();

    const { error } = await supabase.from('user_profiles').select().limit(1);

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
    return ApiResponseBuilder.forbidden();
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
