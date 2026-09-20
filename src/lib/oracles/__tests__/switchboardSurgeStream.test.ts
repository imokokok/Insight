import { ed25519 } from '@noble/curves/ed25519.js';

import { SWITCHBOARD_FEED_IDS } from '../constants/switchboardConstants';
import {
  parseSignedSurgeUpdate,
  parseSwitchboardSecretKey,
  type SignedSurgeMessage,
} from '../services/switchboardSurgeStream';

function signedMessage(): SignedSurgeMessage {
  const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
  const signer = ed25519.getPublicKey(seed);
  const checksum = Buffer.from('verified-switchboard-bundle');
  const signature = ed25519.sign(Uint8Array.from(checksum), seed);
  return {
    type: 'BundledFeedUpdate',
    broadcast_ts_ms: 1_800_000_000_000,
    feed_values: [
      {
        feed_hash: SWITCHBOARD_FEED_IDS.BTC,
        value: '80000000000000000000000',
        event_ts: 1_800_000_000_000,
      },
      {
        feed_hash: SWITCHBOARD_FEED_IDS.ETH,
        value: '4000000000000000000000',
        event_ts: 1_800_000_000_001,
      },
    ],
    oracle_response: {
      signature: Buffer.from(signature).toString('base64'),
      checksum: checksum.toString('base64'),
      ed25519_enclave_signer: Buffer.from(signer).toString('hex'),
      oracle_pubkey: 'oracle-pubkey',
      eth_address: '0x1234',
      slot: 123,
      recovery_id: 0,
    },
  };
}

describe('Switchboard Surge signed stream', () => {
  it('verifies and converts only the configured BTC/ETH signed bundle', () => {
    const prices = parseSignedSurgeUpdate(signedMessage(), 'https://gateway.example');

    expect(prices).toHaveLength(2);
    expect(prices[0]).toMatchObject({
      symbol: 'BTC',
      price: 80_000,
      source: 'switchboard-surge-signed',
      verificationLevel: 'signed',
      countsTowardOracleQuorum: true,
    });
    expect(prices[1]).toMatchObject({ symbol: 'ETH', price: 4_000 });
    expect(prices[0].verification).toMatchObject({
      method: 'switchboardSurgeEd25519',
      signatureScheme: 'ed25519',
      blockNumber: 123,
    });
  });

  it('rejects a bundle whose oracle signature does not verify', () => {
    const message = signedMessage();
    message.oracle_response!.signature = Buffer.alloc(64).toString('base64');
    expect(() => parseSignedSurgeUpdate(message, 'https://gateway.example')).toThrow(
      'signature verification failed'
    );
  });

  it('accepts Solana JSON secret-key arrays without logging the key', () => {
    const parsed = parseSwitchboardSecretKey(JSON.stringify(new Array(32).fill(7)));
    expect(parsed).toHaveLength(32);
    expect([...parsed]).toEqual(new Array(32).fill(7));
  });
});
