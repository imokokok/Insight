import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import {
  ApiResponseBuilder,
  createApiHandler,
  createOptionsHandler,
  V1_STANDARD_MIDDLEWARES,
} from '@/lib/api/handler';
import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import {
  signSolanaEvidence,
  solanaEvidenceContextCommitment,
  solanaEvidenceSignerPublicKey,
} from '@/lib/execution/solanaEvidence';
import { collectSolanaExecutionFacts } from '@/lib/execution/solanaExecutionCollector';

export const runtime = 'nodejs';
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const ReceiptBodySchema = z.object({
  signature: z.string().min(87).max(88).regex(BASE58),
  sourceAssetId: z.string().min(1).max(128),
  destinationAssetId: z.string().min(1).max(128),
  taker: z.string().min(32).max(44).regex(BASE58),
});

export const OPTIONS = createOptionsHandler();

export const POST = createApiHandler(
  async (request: NextRequest, context) => {
    if (!solanaEvidenceSignerPublicKey()) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'SIGNING_UNAVAILABLE',
          'The dedicated Solana evidence signer is not configured or is invalid.',
          { requestId: context.requestId }
        ),
        { status: 503 }
      );
    }
    const body = context.validated!.body!;
    const collection = await collectSolanaExecutionFacts({
      signature: body.signature,
      sourceAssetId: body.sourceAssetId,
      destinationAssetId: body.destinationAssetId,
      taker: body.taker,
      endpoints: getRpcEndpoints(0) ?? [],
      signal: request.signal,
    });
    if (!collection.ok) {
      const status =
        collection.code === 'NOT_FOUND'
          ? 404
          : collection.code.startsWith('INVALID_') || collection.code === 'UNSUPPORTED_ASSET'
            ? 400
            : 502;
      return NextResponse.json(
        ApiResponseBuilder.error(collection.code, collection.message, {
          requestId: context.requestId,
        }),
        { status }
      );
    }
    const facts = collection.facts;
    const receipt = signSolanaEvidence('insight.solana-execution-receipt.v1', {
      facts,
      issuedAt: Math.floor(Date.now() / 1000),
      assertionScope: facts.fillScope,
      source: 'solana-json-rpc',
    });
    if (!receipt) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'SIGNING_UNAVAILABLE',
          'The dedicated Solana evidence signer is unavailable.',
          { requestId: context.requestId }
        ),
        { status: 503 }
      );
    }
    return NextResponse.json(
      ApiResponseBuilder.success(
        {
          receipt,
          contextCommitment: solanaEvidenceContextCommitment(receipt),
          signerPublicKey: receipt.signer.publicKey,
        },
        { requestId: context.requestId }
      )
    );
  },
  { middlewares: V1_STANDARD_MIDDLEWARES, validation: { body: ReceiptBodySchema } }
);
