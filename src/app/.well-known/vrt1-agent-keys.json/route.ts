/**
 * Public VRT1 agent-key document (RFC 8615 `.well-known`).
 *
 * The out-of-band half of the registry genesis trust root: the anchor fixes
 * the genesis in time, this file binds the signing keys to Insight. Tutankhamun
 * asked for a location we control rather than one he invents, so a verifier can
 * point the two halves of the trust root at each other.
 *
 * GET /.well-known/vrt1-agent-keys.json
 */

import { type NextRequest, NextResponse } from 'next/server';

const AGENT_KEYS = {
  version: 1,
  attester: 'Insight (oracleinsight.xyz)',
  registry: 'https://www.oracleinsight.xyz/.well-known/oracle-keys.json',
  keys: [
    {
      key_id: 'vrt1-agent',
      key_type: 'secp256k1_xonly',
      public_key: '299a3d33b17a6ee05f3fdf0b10cde3a074a6c49bb918ffb5ce404ea61762142b',
      custody: 'offline',
      role: 'signs registry snapshots; held offline, never on the request path',
      genesis: {
        action_id: '87b750e4b157656cf1799e73756cf954dd4682173dfaa394a4246a2dc0e0cc9c',
        block: 964407,
        txid: '47762185c15e166f16a010cde32c682300ebc8d2eacca8d0b1f5776aefbe7f71',
        epoch: 2979837,
      },
    },
    {
      key_id: 'vrt1-agent-recovery',
      key_type: 'secp256k1_xonly',
      public_key: 'f1618f8fb416ce3bd493b76fb2ce332bf44aac100dbbdf675e59ec8804689363',
      custody: 'offline',
      role: 'authorizes a replacement signer if the agent key is lost; held offline',
    },
  ],
};

export async function GET(_req: NextRequest) {
  return NextResponse.json(AGENT_KEYS, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
