/**
 * Collects transaction-level Solana SPL swap facts. The returned measurement
 * is unsigned and covers net wallet-owned token balance changes for the full
 * transaction; use the EVM attestation endpoint for the existing signed
 * Execution Receipt schema.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import { collectSolanaExecutionFacts } from '@/lib/execution/solanaExecutionCollector';

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const CollectBodySchema = z.object({
  signature: z.string().min(87).max(88).regex(BASE58),
  sourceAssetId: z.string().min(1).max(128),
  destinationAssetId: z.string().min(1).max(128),
  taker: z.string().min(32).max(44).regex(BASE58),
});

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler(
  async (request: NextRequest, context) => {
    const body = context.validated!.body!;
    const collection = await collectSolanaExecutionFacts({
      signature: body.signature,
      sourceAssetId: body.sourceAssetId,
      destinationAssetId: body.destinationAssetId,
      taker: body.taker,
      endpoints: getRpcEndpoints(0) ?? [],
      signal: request.signal,
    });
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          collection,
          signed: false,
          assertionScope: collection.ok ? collection.facts.fillScope : null,
        },
        { requestId: context.requestId }
      )
    );
  },
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { body: CollectBodySchema },
  }
);
