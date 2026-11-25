import { NextResponse } from 'next/server';

import { z } from 'zod';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { getPriceRecordsD1Database, saveD1PriceRecords } from '@/lib/cloudflare/priceRecords';
import type { PriceRecordInsert } from '@/lib/supabase/queries';
import { FAILURE_MODE_VALUES } from '@/types/oracle/signals';

const MAX_BODY_BYTES = 512 * 1024;
const MAX_BATCH_SIZE = 100;

const timestampSchema = z.union([
  z.number().finite().int().positive().max(Number.MAX_SAFE_INTEGER),
  z
    .string()
    .min(1)
    .max(64)
    .refine((value) => {
      if (/^-?\d+$/.test(value)) return Number.isSafeInteger(Number(value));
      return Number.isFinite(Date.parse(value));
    }),
]);

const ttlSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => /^\d+[smhd]$/.test(value) || Number.isFinite(Date.parse(value)));

const signalVectorSchema = z
  .object({
    freshness: z.number().finite().min(0).max(1),
    sourceReliability: z.number().finite().min(0).max(1),
    metadataCompleteness: z.number().finite().min(0).max(1),
    consistency: z.number().finite().min(0).max(1),
    auditStatus: z.number().finite().min(0).max(1),
  })
  .strict()
  .nullable()
  .optional();

const priceRecordSchema = z
  .object({
    provider: z.string().min(1).max(64),
    symbol: z.string().min(1).max(128),
    chain: z.string().max(64).nullable().optional(),
    price: z.number().finite().positive().max(999_999_999_999.99999999),
    timestamp: timestampSchema,
    decimals: z.number().int().min(0).max(255).nullable().optional(),
    confidence: z.number().finite().min(0).max(1).nullable().optional(),
    source: z.string().max(256).nullable().optional(),
    verification: z.record(z.string(), z.unknown()).nullable().optional(),
    ingestion_timestamp: timestampSchema.nullable().optional(),
    metadata_fallback: z.boolean().nullable().optional(),
    failure_mode: z.enum(FAILURE_MODE_VALUES).nullable().optional(),
    signal_vector: signalVectorSchema,
    ttl: ttlSchema.optional(),
  })
  .strict();

const requestSchema = z
  .object({ records: z.array(priceRecordSchema).min(1).max(MAX_BATCH_SIZE) })
  .strict();

export async function POST(request: Request): Promise<NextResponse> {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  let rawBody: string;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
    }
    rawBody = new TextDecoder().decode(bytes);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid price-record batch' }, { status: 400 });
  }

  try {
    const saved = await saveD1PriceRecords(
      await getPriceRecordsD1Database(),
      parsed.data.records as PriceRecordInsert[]
    );
    return NextResponse.json({ saved }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch {
    return NextResponse.json({ error: 'Price-record storage unavailable' }, { status: 503 });
  }
}
