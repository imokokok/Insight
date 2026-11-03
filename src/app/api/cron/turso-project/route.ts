import { NextResponse } from 'next/server';

import { verifyIngestSchedulerSecret } from '@/lib/api/cronAuth';
import { readTursoPriceWriteMode } from '@/lib/turso/price/client';
import {
  assertTursoPriceProjectionHealthy,
  runTursoPriceProjection,
} from '@/lib/turso/price/projectionRunner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// A recovery run can drain several 32-slot batches after a downstream outage.
export const maxDuration = 180;

function readPositiveInteger(name: string, fallback: number, maximum: number): number {
  const raw = process.env[name] ?? String(fallback);
  if (!/^\d+$/.test(raw)) throw new Error(`Invalid ${name}`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

/**
 * Cloudflare's independent projection clock invokes this route. It never
 * fetches oracle prices and never mutates raw Turso evidence: it only drains
 * the durable Turso-to-Supabase outbox.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authResponse = verifyIngestSchedulerSecret(request);
  if (authResponse) return authResponse;

  try {
    if (readTursoPriceWriteMode() !== 'primary') {
      return NextResponse.json({ success: true, skipped: 'turso primary mode is not enabled' });
    }

    const result = await runTursoPriceProjection(
      readPositiveInteger('TURSO_PRICE_PROJECTION_BATCH_SIZE', 16, 32),
      readPositiveInteger('TURSO_PRICE_PROJECTION_MAX_BATCHES', 4, 8)
    );
    assertTursoPriceProjectionHealthy(result);

    const response = NextResponse.json({ success: true, ...result });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    const response = NextResponse.json(
      { success: false, error: 'Turso price projection failed', retryable: true },
      { status: 503 }
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
