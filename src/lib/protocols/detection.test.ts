import { detectPositions, isImportableProtocol } from './detection';
import { importPosition } from './importer';
import { PROTOCOL_REGISTRY } from './protocolRegistry';

import type { ImportedPosition } from './importer/types';

jest.mock('./importer', () => ({
  importPosition: jest.fn(),
}));

const mockImportPosition = importPosition as jest.Mock;

function makePosition(opts: {
  collaterals: number;
  borrows: number;
  skipped?: number;
}): ImportedPosition {
  return {
    address: '0x0000000000000000000000000000000000000001' as `0x${string}`,
    protocolId: 'x',
    collaterals: Array.from({ length: opts.collaterals }, (_, i) => ({
      symbol: `C${i}`,
      amount: 1,
      underlyingAsset: `0x${i}0000000000000000000000000000000000000` as `0x${string}`,
    })),
    borrows: Array.from({ length: opts.borrows }, (_, i) => ({
      symbol: `B${i}`,
      amount: 1,
      underlyingAsset: `0x${i}0000000000000000000000000000000000000` as `0x${string}`,
    })),
    skippedAssets: Array.from({ length: opts.skipped ?? 0 }, (_, i) => ({
      underlyingAsset: `0x${i}ffffffffffffffffffffffffffffffffffffff` as `0x${string}`,
      symbol: `S${i}`,
      reason: 'unsupported' as const,
    })),
    rawPositions: [],
    importedAt: 0,
  };
}

describe('isImportableProtocol', () => {
  it('flags lending protocols with importable contracts as supported', () => {
    const aave = PROTOCOL_REGISTRY.find((p) => p.id === 'aave-v3-ethereum')!;
    const venus = PROTOCOL_REGISTRY.find((p) => p.id === 'venus-bnb-chain')!;
    expect(isImportableProtocol(aave)).toBe(true);
    expect(isImportableProtocol(venus)).toBe(true);
  });

  it('flags DEX / contract-less protocols as unsupported', () => {
    const uni = PROTOCOL_REGISTRY.find((p) => p.id === 'uniswap-v3-ethereum')!;
    expect(uni.protocolType).toBe('dex');
    expect(isImportableProtocol(uni)).toBe(false);
  });
});

describe('detectPositions', () => {
  const ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`;

  afterEach(() => mockImportPosition.mockReset());

  it('returns one detection per registry protocol with correct support flags', async () => {
    mockImportPosition.mockResolvedValue(makePosition({ collaterals: 1, borrows: 1 }));

    const detections = await detectPositions(ADDRESS);

    expect(detections).toHaveLength(PROTOCOL_REGISTRY.length);
    const aave = detections.find((d) => d.protocolId === 'aave-v3-ethereum')!;
    const uni = detections.find((d) => d.protocolId === 'uniswap-v3-ethereum')!;
    expect(aave.supported).toBe(true);
    expect(uni.supported).toBe(false);
    expect(uni.hasPosition).toBe(false);
    expect(uni.position).toBeNull();
  });

  it('marks hasPosition for protocols returning a non-empty position', async () => {
    mockImportPosition.mockImplementation(async (protocol) => {
      // Only Aave has a position; everything else empty.
      if (protocol.id === 'aave-v3-ethereum') {
        return makePosition({ collaterals: 2, borrows: 1 });
      }
      return makePosition({ collaterals: 0, borrows: 0 });
    });

    const detections = await detectPositions(ADDRESS);
    const aave = detections.find((d) => d.protocolId === 'aave-v3-ethereum')!;
    const compound = detections.find((d) => d.protocolId === 'compound-v3-ethereum')!;

    expect(aave.hasPosition).toBe(true);
    expect(aave.position?.collaterals.length).toBe(2);
    expect(compound.hasPosition).toBe(false);
  });

  it('captures per-protocol scan errors without dropping the whole scan', async () => {
    mockImportPosition.mockImplementation(async (protocol) => {
      if (protocol.id === 'aave-v3-ethereum') {
        throw new Error('RPC timeout');
      }
      return makePosition({ collaterals: 0, borrows: 0 });
    });

    const detections = await detectPositions(ADDRESS);
    const aave = detections.find((d) => d.protocolId === 'aave-v3-ethereum')!;

    expect(aave.supported).toBe(true);
    expect(aave.error).toBe('RPC timeout');
    expect(aave.hasPosition).toBe(false);
    // The rest still resolved.
    expect(detections.filter((d) => d.supported && !d.error).length).toBeGreaterThan(0);
  });

  it('surfaces skipped (un-configured) assets from the import', async () => {
    mockImportPosition.mockResolvedValue(makePosition({ collaterals: 1, borrows: 1, skipped: 2 }));

    const detections = await detectPositions(ADDRESS);
    const aave = detections.find((d) => d.protocolId === 'aave-v3-ethereum')!;

    expect(aave.skippedAssets).toHaveLength(2);
    expect(aave.skippedAssets[0].reason).toBe('unsupported');
  });
});
