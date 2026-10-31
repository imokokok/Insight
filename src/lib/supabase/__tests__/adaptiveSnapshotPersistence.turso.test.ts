/** @jest-environment node */
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  getTursoPriceClient,
  readTursoPriceConfig,
  readTursoPriceReadCutoverMs,
  readTursoPriceWriteMode,
} from '@/lib/turso/price/client';
import {
  acknowledgeTursoPriceSlot,
  captureTursoPriceSlot,
  listPendingTursoPriceSlots,
} from '@/lib/turso/price/slotRepository';

import {
  commitSnapshotDataSlot,
  reconcilePendingTursoPriceSlots,
} from '../adaptiveSnapshotPersistence';

jest.mock('@/lib/turso/price/client', () => ({
  getTursoPriceClient: jest.fn(),
  readTursoPriceConfig: jest.fn(),
  readTursoPriceReadCutoverMs: jest.fn(),
  readTursoPriceWriteMode: jest.fn(),
}));
jest.mock('@/lib/turso/price/slotRepository', () => ({
  acknowledgeTursoPriceSlot: jest.fn(),
  captureTursoPriceSlot: jest.fn(),
  listPendingTursoPriceSlots: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));
jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({ warn: jest.fn() })),
}));

const mockedMode = jest.mocked(readTursoPriceWriteMode);
const mockedConfig = jest.mocked(readTursoPriceConfig);
const mockedReadCutover = jest.mocked(readTursoPriceReadCutoverMs);
const mockedClient = jest.mocked(getTursoPriceClient);
const mockedCapture = jest.mocked(captureTursoPriceSlot);
const mockedAck = jest.mocked(acknowledgeTursoPriceSlot);
const mockedPending = jest.mocked(listPendingTursoPriceSlots);
const mockedCreateServiceRoleClient = jest.mocked(createServiceRoleClient);
const mockRpc = jest.fn();

const input = {
  provider: 'dia',
  symbol: 'ETH',
  chainId: 1,
  price: 2_000,
  consensusPrice: 2_000,
  deviationPct: 0,
  latencyMs: 15,
  dataAgeSeconds: 2,
  confidence: 0.9,
  isSuccess: true,
  errorMessage: null,
  snapshotHour: new Date('2026-10-31T10:00:00.000Z'),
};

const summary = {
  received: 1,
  candidates: 1,
  persisted: 1,
  fullResolution: 1,
  initial: 0,
  stateTransition: 0,
  errorChange: 0,
  hourlyBaseline: 0,
  priceChange: 0,
  deviationChange: 0,
  dataAgeChange: 0,
  confidenceChange: 0,
  stableSkipped: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedMode.mockReturnValue('primary');
  mockedConfig.mockReturnValue({
    url: 'libsql://insight-imokokok.aws-ap-southeast-1.turso.io',
    authToken: 'test-token',
    partitionKey: 'bootstrap',
  });
  mockedReadCutover.mockReturnValue(input.snapshotHour.getTime());
  mockedClient.mockReturnValue({} as never);
  mockedCreateServiceRoleClient.mockReturnValue({ rpc: mockRpc } as never);
  mockRpc.mockResolvedValue({ data: { hourlyWritten: 1, replayed: false }, error: null });
  mockedCapture.mockResolvedValue({
    slotMs: input.snapshotHour.getTime(),
    inputHash: 'a'.repeat(64),
    rawDigest: 'b'.repeat(64),
    inputs: [
      {
        provider: 'dia',
        symbol: 'ETH',
        chainId: 1,
        price: 2_000,
        consensusPrice: 2_000,
        deviationPct: 0,
        latencyMs: 15,
        dataAgeSeconds: 2,
        confidence: 0.9,
        isSuccess: true,
        errorMessage: null,
        snapshotHourMs: input.snapshotHour.getTime(),
      },
    ],
    summary,
    replayed: false,
  });
});

it('projects a Turso-captured slot once and acknowledges it only after Supabase succeeds', async () => {
  await expect(commitSnapshotDataSlot([input], input.snapshotHour)).resolves.toEqual({
    hourlyWritten: 1,
    persistence: summary,
  });

  expect(mockedCapture).toHaveBeenCalledWith(
    expect.anything(),
    expect.any(Array),
    input.snapshotHour.getTime()
  );
  expect(mockRpc).toHaveBeenCalledWith(
    'project_turso_price_slot',
    expect.objectContaining({
      p_snapshot_ts: input.snapshotHour.toISOString(),
      p_partition_key: 'bootstrap',
      p_input_hash: 'a'.repeat(64),
      p_raw_digest: 'b'.repeat(64),
    })
  );
  expect(mockedAck).toHaveBeenCalledWith(
    expect.anything(),
    input.snapshotHour.getTime(),
    'a'.repeat(64)
  );
});

it('replays only pending immutable payloads and skips reconciliation outside primary mode', async () => {
  mockedPending.mockResolvedValue([
    {
      slotMs: input.snapshotHour.getTime(),
      inputHash: 'a'.repeat(64),
      rawDigest: 'b'.repeat(64),
      inputs: [
        {
          provider: 'dia',
          symbol: 'ETH',
          chainId: 1,
          price: 2_000,
          consensusPrice: 2_000,
          deviationPct: 0,
          latencyMs: 15,
          dataAgeSeconds: 2,
          confidence: 0.9,
          isSuccess: true,
          errorMessage: null,
          snapshotHourMs: input.snapshotHour.getTime(),
        },
      ],
    },
  ]);
  await expect(reconcilePendingTursoPriceSlots()).resolves.toBe(1);
  expect(mockRpc).toHaveBeenCalledWith('project_turso_price_slot', expect.any(Object));
  expect(mockedAck).toHaveBeenCalledTimes(1);

  mockedMode.mockReturnValue('legacy');
  await expect(reconcilePendingTursoPriceSlots()).resolves.toBe(0);
  expect(mockedPending).toHaveBeenCalledTimes(1);
});

it('accepts a cold Turso shadow slot when its write shape matches Supabase', async () => {
  mockedMode.mockReturnValue('shadow');
  const supabaseSummary = {
    ...summary,
    fullResolution: 0,
    hourlyBaseline: 1,
  };
  const tursoSummary = {
    ...supabaseSummary,
    initial: 1,
    hourlyBaseline: 0,
  };
  mockRpc.mockResolvedValue({
    data: { hourlyWritten: 1, persistence: supabaseSummary },
    error: null,
  });
  mockedCapture.mockResolvedValue({
    slotMs: input.snapshotHour.getTime(),
    inputHash: 'a'.repeat(64),
    rawDigest: 'b'.repeat(64),
    inputs: [],
    summary: tursoSummary,
    replayed: false,
  });

  await expect(commitSnapshotDataSlot([input], input.snapshotHour)).resolves.toEqual({
    hourlyWritten: 1,
    persistence: supabaseSummary,
  });
});

it('rejects a Turso shadow slot when its write shape differs from Supabase', async () => {
  mockedMode.mockReturnValue('shadow');
  mockRpc.mockResolvedValue({
    data: { hourlyWritten: 1, persistence: summary },
    error: null,
  });
  mockedCapture.mockResolvedValue({
    slotMs: input.snapshotHour.getTime(),
    inputHash: 'a'.repeat(64),
    rawDigest: 'b'.repeat(64),
    inputs: [],
    summary: {
      ...summary,
      persisted: 0,
      stableSkipped: 1,
    },
    replayed: false,
  });

  await expect(commitSnapshotDataSlot([input], input.snapshotHour)).rejects.toThrow(
    'Turso shadow persistence write shape diverged for persisted: expected=1 actual=0'
  );
});
