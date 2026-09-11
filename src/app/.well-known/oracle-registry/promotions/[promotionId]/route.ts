/** Resolve one immutable, content-addressed mainline protocol promotion. */

import { type NextRequest, NextResponse } from 'next/server';

import { mainlineProtocolPromotionById } from '@/lib/protocol/mainlinePromotionRegistry';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ promotionId: string }> }
) {
  const { promotionId } = await context.params;
  const promotion = mainlineProtocolPromotionById(promotionId);
  if (!promotion) {
    return NextResponse.json(
      { error: 'unknown_mainline_protocol_promotion', promotionId },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      promotionId: promotion.promotionId,
      digest: {
        algorithm: 'keccak256',
        canonicalization: 'RFC 8785 JSON Canonicalization Scheme',
        scope: 'the promotion object excluding promotionId',
      },
      promotion,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
