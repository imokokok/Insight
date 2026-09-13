/** Resolve an immutable ExecutionReceipt semantic profile by its signed id. */

import { type NextRequest, NextResponse } from 'next/server';

import { executionProfileById } from '@/lib/attestations/executionProfiles';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await context.params;
  const profile = executionProfileById(profileId);
  if (!profile) {
    return NextResponse.json(
      { error: 'unknown_execution_profile', profileId },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      profileId: profileId.toLowerCase(),
      digest: {
        algorithm: 'keccak256',
        canonicalization: 'RFC 8785 JSON Canonicalization Scheme',
        scope: 'the profile object in this response',
      },
      profile,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
