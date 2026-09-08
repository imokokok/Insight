/** Resolve an immutable, content-addressed oracle registry protocol release. */

import { type NextRequest, NextResponse } from 'next/server';

import { oracleRegistryReleaseById } from '@/lib/attestations/oracleRegistryRelease';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ releaseId: string }> }
) {
  const { releaseId } = await context.params;
  const release = oracleRegistryReleaseById(releaseId);
  if (!release) {
    return NextResponse.json(
      { error: 'unknown_oracle_registry_release', releaseId },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      releaseId: releaseId.toLowerCase(),
      digest: {
        algorithm: 'keccak256',
        canonicalization: 'RFC 8785 JSON Canonicalization Scheme',
        scope: 'the release object in this response',
      },
      release,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
