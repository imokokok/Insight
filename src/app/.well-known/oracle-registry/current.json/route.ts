/** Small mutable pointer to the current immutable registry release. */

import { type NextRequest, NextResponse } from 'next/server';

import {
  CURRENT_ORACLE_REGISTRY_RELEASE,
  CURRENT_ORACLE_REGISTRY_RELEASE_ID,
} from '@/lib/attestations/oracleRegistryRelease';
import {
  CURRENT_MAINLINE_PROTOCOL_PROMOTION,
  CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID,
} from '@/lib/protocol/mainlinePromotionRegistry';

function originOf(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const origin = originOf(request);
  return NextResponse.json(
    {
      registryRevision: CURRENT_ORACLE_REGISTRY_RELEASE.registryRevision,
      releaseId: CURRENT_ORACLE_REGISTRY_RELEASE_ID,
      effectiveFrom: CURRENT_ORACLE_REGISTRY_RELEASE.effectiveFrom,
      release: `${origin}/.well-known/oracle-registry/releases/${CURRENT_ORACLE_REGISTRY_RELEASE_ID}`,
      stableRegistry: `${origin}/.well-known/oracle-keys.json`,
      promotion: {
        promotionId: CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID,
        promotionVersion: CURRENT_MAINLINE_PROTOCOL_PROMOTION.promotionVersion,
        immutable: `${origin}/.well-known/oracle-registry/promotions/${CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID}`,
      },
      partnerIntegrations: {
        activationSetId:
          CURRENT_ORACLE_REGISTRY_RELEASE.mainlineIntegrationIsolation.activationSetId,
        current: `${origin}${CURRENT_ORACLE_REGISTRY_RELEASE.mainlineIntegrationIsolation.currentPath}`,
        immutableSet: `${origin}${CURRENT_ORACLE_REGISTRY_RELEASE.mainlineIntegrationIsolation.immutableSetPath}`,
        runtime: {
          executionVerifyTemplate: `${origin}/api/v1/partners/{partnerId}/execution/attestation/verify`,
          executionVerifyPairTemplate: `${origin}/api/v1/partners/{partnerId}/execution/attestation/verify-pair`,
          requiredBodyField: 'policyId',
          registryReleasePinRule:
            CURRENT_ORACLE_REGISTRY_RELEASE.mainlineIntegrationIsolation.registryReleasePinRule,
        },
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
