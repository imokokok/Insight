/** Resolve one immutable, content-addressed partner integration policy. */

import { type NextRequest, NextResponse } from 'next/server';

import { partnerIntegrationPolicyById } from '@/lib/protocol/partnerIntegrationRegistry';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ policyId: string }> }
) {
  const { policyId } = await context.params;
  const policy = partnerIntegrationPolicyById(policyId);
  if (!policy) {
    return NextResponse.json(
      { error: 'unknown_partner_integration_policy', policyId },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      policyId: policy.policyId,
      digest: {
        algorithm: 'keccak256',
        canonicalization: 'RFC 8785 JSON Canonicalization Scheme',
        scope: 'the policy object excluding policyId',
      },
      policy,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
