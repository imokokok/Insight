/**
 * @fileoverview Market-reference sample endpoint.
 *
 * Read-only, third-party-verifiable view of the external truth layer for one
 * symbol: the latest usable hourly CEX reference price, its freshness, and the
 * cross-exchange spread — the inputs to oracle-vs-market divergence. A
 * verifier can reproduce this from the `market_reference_snapshots` rows
 * (migration 0037) without trusting this endpoint (APS/Headless discipline:
 * independent re-derivation, not endorsement). Fail-closed: a stale or absent
 * rollup row returns 404 with a `stale` flag — never an estimated price.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { getMarketReference } from '@/lib/marketReference/client';
import { SafeSymbolSchema } from '@/lib/security/validation';

const SampleQuerySchema = z.object({
  symbol: SafeSymbolSchema,
});

export const OPTIONS = createOptionsHandler();

export const GET = createApiHandler(
  async (_request: NextRequest, context) => {
    const { symbol } = context.validated!.query! as { symbol: string };
    const ref = await getMarketReference(symbol);

    if (!ref) {
      return NextResponse.json(
        {
          symbol: symbol.toUpperCase(),
          available: false,
          reason: 'no_fresh_reference',
          note: 'Reference layer absent or stale (>= 3h) — fail-closed, no estimated price.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      symbol: ref.symbol,
      available: true,
      refHour: ref.refHour,
      refPrice: ref.refPrice,
      quote: 'USD',
      exchangeCount: ref.exchangeCount,
      crossExchangeSpreadPct: ref.crossExchangeSpreadPct,
      freshness: {
        maxAgeHours: 3,
        note: 'rows older than this are treated as absent (fail-closed)',
      },
      note: 'Independent CEX reference (non-derived source). Evidence for oracle-vs-market divergence — not a verdict input.',
    });
  },
  { validation: { query: SampleQuerySchema } }
);
