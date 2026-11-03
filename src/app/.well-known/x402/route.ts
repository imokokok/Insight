import { NextResponse } from 'next/server';

import { getX402Config } from '@/lib/api/x402/config';
import { buildX402DiscoveryManifest } from '@/lib/api/x402/discoveryManifest';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Public x402 discovery generated from the live route-payment configuration. */
export function GET() {
  return NextResponse.json(buildX402DiscoveryManifest(getX402Config()), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
