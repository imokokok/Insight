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
import { simulateSolanaTransaction } from '@/lib/execution/solanaSimulation';

export const runtime = 'nodejs';
const SimulationBodySchema = z.object({
  transactionBase64: z.string().min(8).max(12_000),
  expectedMessageHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
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
    const simulation = await simulateSolanaTransaction({
      transactionBase64: body.transactionBase64,
      endpoints: getRpcEndpoints(0) ?? [],
      signal: request.signal,
    });
    if (!simulation.ok) {
      const status =
        simulation.code === 'INVALID_TRANSACTION'
          ? 400
          : simulation.code === 'CLUSTER_MISMATCH'
            ? 502
            : 503;
      return NextResponse.json(
        ApiResponseBuilder.error(simulation.code, simulation.message, {
          requestId: context.requestId,
        }),
        { status }
      );
    }
    if (simulation.payload.signatureState !== 'UNSIGNED') {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'TRANSACTION_ALREADY_SIGNED',
          'Pre-sign simulation requires all transaction signature slots to be zeroed.',
          { requestId: context.requestId }
        ),
        { status: 400 }
      );
    }
    if (simulation.payload.messageHash.toLowerCase() !== body.expectedMessageHash.toLowerCase()) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'MESSAGE_HASH_MISMATCH',
          'The simulated transaction message does not match expectedMessageHash.',
          { requestId: context.requestId }
        ),
        { status: 400 }
      );
    }
    const receipt = signSolanaEvidence('insight.solana-simulation-receipt.v1', {
      simulation: simulation.payload,
      expectedMessageHash: body.expectedMessageHash.toLowerCase(),
      issuedAt: Math.floor(Date.now() / 1000),
      assertionScope: 'PRE_SIGN_TRANSACTION_SIMULATION',
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
  {
    middlewares: V1_STANDARD_MIDDLEWARES,
    validation: { body: SimulationBodySchema },
    maxBodyBytes: 16_384,
  }
);
