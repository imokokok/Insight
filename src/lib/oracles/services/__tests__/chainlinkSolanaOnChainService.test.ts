import {
  CHAINLINK_SOLANA_MAINNET_GENESIS_HASH,
  CHAINLINK_SOLANA_STORE_PROGRAM_ID,
  CHAINLINK_SOLANA_TRANSMISSIONS_DISCRIMINATOR,
} from '../../constants/chainlinkSolana';
import {
  ChainlinkSolanaOnChainService,
  parseChainlinkSolanaDirectory,
} from '../chainlinkSolanaOnChainService';

const ACCOUNT_ADDRESS = 'CH31Xns5z3M1cTAbKW34jcxPPciazARpijcHj9rxtemt';
const NOW_SECONDS = 1_792_871_046;

function directoryEntry(overrides: Record<string, unknown> = {}) {
  return {
    transmissionsAccount: ACCOUNT_ADDRESS,
    heartbeat: 60,
    docs: {
      baseAsset: 'SOL',
      quoteAsset: 'USD',
      assetClass: 'Crypto',
    },
    ...overrides,
  };
}

function accountData(
  overrides: { description?: string; timestamp?: number; answer?: bigint } = {}
) {
  const bytes = Buffer.alloc(248);
  CHAINLINK_SOLANA_TRANSMISSIONS_DISCRIMINATOR.copy(bytes, 0);
  Buffer.from(overrides.description ?? 'SOL / USD', 'ascii').copy(bytes, 106);
  bytes[138] = 8;
  bytes.writeUInt32LE(42, 143);
  bytes.writeUInt32LE(1, 148);
  bytes.writeBigUInt64LE(123_456_789n, 200);
  bytes.writeUInt32LE(overrides.timestamp ?? NOW_SECONDS - 10, 208);
  bytes.writeBigInt64LE(overrides.answer ?? 10_125_000_000n, 216);
  bytes.writeBigInt64LE(0n, 224);
  return bytes.toString('base64');
}

function jsonResponse(body: unknown) {
  return {
    ok: true,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as Response;
}

function fetcherFor(account: Record<string, unknown> | null): typeof fetch {
  return jest.fn(async (url: string | URL, init?: RequestInit) => {
    if (String(url).includes('reference-data-directory.vercel.app')) {
      return jsonResponse([directoryEntry()]);
    }
    const request = JSON.parse(String(init?.body)) as { id: string; method: string };
    if (request.method === 'getGenesisHash') {
      return jsonResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: CHAINLINK_SOLANA_MAINNET_GENESIS_HASH,
      });
    }
    return jsonResponse({
      jsonrpc: '2.0',
      id: request.id,
      result: { context: { slot: 460_973_132 }, value: [account] },
    });
  }) as unknown as typeof fetch;
}

describe('ChainlinkSolanaOnChainService', () => {
  it('keeps only unique USD entries with a bounded official heartbeat', () => {
    expect(
      parseChainlinkSolanaDirectory([
        directoryEntry(),
        directoryEntry({
          transmissionsAccount: '2ypeVyYnZaW2TNYXXTaZq9YhYvnqcjCiifW1C6n8b62P',
        }),
        directoryEntry({ heartbeat: 0 }),
      ])
    ).toEqual([]);

    expect(parseChainlinkSolanaDirectory([directoryEntry()])).toEqual([
      expect.objectContaining({
        alias: 'SOL/USD',
        accountAddress: ACCOUNT_ADDRESS,
        heartbeatSeconds: 60,
      }),
    ]);
  });

  it('accepts a fresh Chainlink-owned OCR2 account and preserves audit evidence', async () => {
    const service = new ChainlinkSolanaOnChainService({
      endpoints: () => ['https://rpc.example'],
      fetcher: fetcherFor({
        owner: CHAINLINK_SOLANA_STORE_PROGRAM_ID,
        data: [accountData(), 'base64'],
      }),
      now: () => NOW_SECONDS * 1000,
    });

    await expect(service.getPrice('SOL')).resolves.toMatchObject({
      symbol: 'SOL/USD',
      price: 101.25,
      decimals: 8,
      roundId: '42',
      accountAddress: ACCOUNT_ADDRESS,
      accountOwner: CHAINLINK_SOLANA_STORE_PROGRAM_ID,
      observationSlot: 460_973_132,
      transmissionSlot: '123456789',
    });
  });

  it('rejects a fresh-looking account when its owner is not Chainlink OCR2', async () => {
    const service = new ChainlinkSolanaOnChainService({
      endpoints: () => ['https://rpc.example'],
      fetcher: fetcherFor({
        owner: '11111111111111111111111111111111',
        data: [accountData(), 'base64'],
      }),
      now: () => NOW_SECONDS * 1000,
    });

    await expect(service.getPrices(await service.getOfficialFeeds())).resolves.toEqual([]);
  });

  it('rejects a stale OCR2 transmission even when its account layout is valid', async () => {
    const service = new ChainlinkSolanaOnChainService({
      endpoints: () => ['https://rpc.example'],
      fetcher: fetcherFor({
        owner: CHAINLINK_SOLANA_STORE_PROGRAM_ID,
        data: [accountData({ timestamp: NOW_SECONDS - 121 }), 'base64'],
      }),
      now: () => NOW_SECONDS * 1000,
    });

    await expect(service.getPrices(await service.getOfficialFeeds())).resolves.toEqual([]);
  });
});
