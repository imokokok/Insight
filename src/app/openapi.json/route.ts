import { getMppConfig } from '@/lib/api/mpp/config';
import { buildOpenApiDiscovery } from '@/lib/api/openapi/discovery';
import { getX402Config } from '@/lib/api/x402/config';

// This document is derived exclusively from deployment configuration. Publishing
// a new payment configuration already requires a new deployment, so serving it
// as a build-time static response removes a public function invocation without
// making the advertised capabilities stale.
export const dynamic = 'force-static';
export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=86400, max-age=3600, stale-while-revalidate=86400',
};

export async function GET(): Promise<Response> {
  const x402 = getX402Config();
  const mpp = getMppConfig(x402);
  return Response.json(
    buildOpenApiDiscovery({
      x402Enabled: x402.enabled,
      mppEnabled: mpp.enabled,
      mcpMppEnabled: mpp.mcpEnabled,
      network: x402.network,
      amountAtomic: x402.amountAtomic,
      priceUsd: x402.priceUsd,
    }),
    { headers: CORS_HEADERS }
  );
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
