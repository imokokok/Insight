/** Resolve the immutable set of independently activated partner policies. */

import { type NextRequest, NextResponse } from 'next/server';

import { partnerActivationSetById } from '@/lib/protocol/partnerIntegrationRegistry';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ activationSetId: string }> }
) {
  const { activationSetId } = await context.params;
  const activationSet = partnerActivationSetById(activationSetId);
  if (!activationSet) {
    return NextResponse.json(
      { error: 'unknown_partner_activation_set', activationSetId },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      activationSetId: activationSet.activationSetId,
      digest: {
        algorithm: 'keccak256',
        canonicalization: 'RFC 8785 JSON Canonicalization Scheme',
        scope: 'the activation set excluding activationSetId',
      },
      activationSet,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
