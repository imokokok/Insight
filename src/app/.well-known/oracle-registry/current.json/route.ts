/** Small mutable pointer to the current immutable registry release. */

import { type NextRequest, NextResponse } from 'next/server';

import {
  CURRENT_ORACLE_REGISTRY_RELEASE,
  CURRENT_ORACLE_REGISTRY_RELEASE_ID,
} from '@/lib/attestations/oracleRegistryRelease';

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
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
