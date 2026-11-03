import { createHash } from 'node:crypto';

import { simulateSolanaTransaction } from '../solanaSimulation';

const FULL_MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

function unsignedLegacyTransaction(): { transactionBase64: string; messageHash: string } {
  const message = Buffer.concat([
    Buffer.from([1, 0, 0, 1]),
    Buffer.alloc(32, 1),
    Buffer.alloc(32),
    Buffer.from([0]),
  ]);
  const transaction = Buffer.concat([Buffer.from([1]), Buffer.alloc(64), message]);
  return {
    transactionBase64: transaction.toString('base64'),
    messageHash: `0x${createHash('sha256').update(message).digest('hex')}`,
  };
}

function rpcResponse(id: string, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('simulateSolanaTransaction', () => {
  it('accepts the full mainnet genesis hash returned by Solana JSON-RPC', async () => {
    const { transactionBase64, messageHash } = unsignedLegacyTransaction();
    const fetcher = jest.fn(async (_url: string, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { id: string; method: string };
      if (request.method === 'getGenesisHash') {
        return rpcResponse(request.id, FULL_MAINNET_GENESIS_HASH);
      }
      return rpcResponse(request.id, {
        context: { slot: 123 },
        value: { err: 'BlockhashNotFound', logs: null, unitsConsumed: 0, fee: 5000 },
      });
    });

    const result = await simulateSolanaTransaction({
      transactionBase64,
      endpoints: ['https://rpc.example.test'],
      fetcher: fetcher as unknown as typeof fetch,
      now: () => 1_800_000_000_000,
    });

    expect(result).toEqual({
      ok: true,
      payload: expect.objectContaining({
        network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        messageHash,
        signatureState: 'UNSIGNED',
        simulationSlot: 123,
        simulatedAt: 1_800_000_000,
        status: 'FAILED',
        error: 'BlockhashNotFound',
      }),
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
