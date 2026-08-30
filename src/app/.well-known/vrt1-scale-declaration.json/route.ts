/**
 * Public scale-declaration pin for the VRT1 action type
 * `insight.oracle-safety-check` (RFC 8615 `.well-known`).
 *
 * Two things a holder of a signed receipt cannot derive from the receipt are
 * declared here: the per-field integer scale, and the policy constants. The
 * constants are ALSO carried inside the signed struct at schema v3, so this file
 * is a cross-check rather than the only source. That was the point of moving
 * them into the bytes rather than agreeing to describe them differently.
 *
 * The bytes served are byte-identical to
 * scripts/vrt1-e2e-prototype/registration/scale-declaration.json, so
 * `curl -s <url> | shasum -a 256` reproduces the value VERITAS already verified.
 *
 * GET /.well-known/vrt1-scale-declaration.json
 */

import { type NextRequest, NextResponse } from 'next/server';

import { SCALE_DECLARATION_JSON, SCALE_DECLARATION_SHA256 } from './declaration.generated';

export async function GET(_req: NextRequest) {
  return new NextResponse(SCALE_DECLARATION_JSON, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Scale-Declaration-Sha256': SCALE_DECLARATION_SHA256,
    },
  });
}
