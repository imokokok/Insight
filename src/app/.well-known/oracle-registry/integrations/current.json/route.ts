/** Mutable discovery pointer for the immutable mainline partner activation set. */

import { type NextRequest, NextResponse } from 'next/server';

import {
  CURRENT_PARTNER_ACTIVATION_SET,
  CURRENT_PARTNER_ACTIVATION_SET_ID,
  ORACLE_REGISTRY_RELEASE_PIN_RULE,
  ORACLE_REGISTRY_RELEASE_PIN_RULE_DESCRIPTION,
} from '@/lib/protocol/partnerIntegrationRegistry';

function originOf(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const origin = originOf(request);
  return NextResponse.json(
    {
      activationSetId: CURRENT_PARTNER_ACTIVATION_SET_ID,
      activationVersion: CURRENT_PARTNER_ACTIVATION_SET.activationVersion,
      immutable: `${origin}/.well-known/oracle-registry/integration-sets/${CURRENT_PARTNER_ACTIVATION_SET_ID}`,
      policyTemplate: `${origin}/.well-known/oracle-registry/integrations/{policyId}`,
      registryReleasePolicy: {
        rule: ORACLE_REGISTRY_RELEASE_PIN_RULE,
        description: ORACLE_REGISTRY_RELEASE_PIN_RULE_DESCRIPTION,
      },
      runtime: {
        executionVerifyTemplate: `${origin}/api/v1/partners/{partnerId}/execution/attestation/verify`,
        executionVerifyPairTemplate: `${origin}/api/v1/partners/{partnerId}/execution/attestation/verify-pair`,
        requiredBodyField: 'policyId',
        rule: 'partner runtime requests must name the partner in the path and carry the exact active immutable policy id; public verification routes are not partner activation paths',
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
