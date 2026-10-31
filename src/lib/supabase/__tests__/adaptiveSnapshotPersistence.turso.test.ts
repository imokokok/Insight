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
  latestAcknowledgedTursoPriceSlot,
  listPendingTursoPriceSlots,
  replaceTursoPricePersistenceProjection,
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
  latestAcknowledgedTursoPriceSlot: jest.fn(),
  listPendingTursoPriceSlots: jest.fn(),
  replaceTursoPricePersistenceProjection: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));
jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn() })),
}));

const mockedMode = jest.mocked(readTursoPriceWriteMode);
const mockedConfig = jest.mocked(readTursoPriceConfig);
const mockedReadCutover = jest.mocked(readTursoPriceReadCutoverMs);
const mockedClient = jest.mocked(getTursoPriceClient);
const mockedCapture = jest.mocked(captureTursoPriceSlot);
const mockedAck = jest.mocked(acknowledgeTursoPriceSlot);
const mockedLatestAcknowledged = jest.mocked(latestAcknowledgedTursoPriceSlot);
const mockedPending = jest.mocked(listPendingTursoPriceSlots);
const mockedReplaceProjection = jest.mocked(replaceTursoPricePersistenceProjection);
const mockedCreateServiceRoleClient = jest.mocked(createServiceRoleClient);
const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockLatestStateLimit = jest.fn();
const mockStateRows = jest.fn();
const mockPolicyRows = jest.fn();

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
  mockLatestStateLimit.mockResolvedValue({
    data: [{ last_snapshot_ts: input.snapshotHour.toISOString() }],
    error: null,
  });
  mockStateRows.mockResolvedValue({ data: [], error: null });
  mockPolicyRows.mockResolvedValue({
    data: [
      {
        policy_key: '__default__',
        resolution: 'adaptive',
        price_change_bps: 25,
        deviation_change_bps: 10,
        data_age_change_seconds: 300,
        confidence_change: '0.0500',
      },
    ],
    error: null,
  });
  mockFrom.mockImplementation((table: string) => ({
    select: () => {
      if (table === 'price_snapshot_persistence_state') {
        return Object.assign(mockStateRows(), { order: () => ({ limit: mockLatestStateLimit }) });
      }
      if (table === 'price_snapshot_persistence_policies') return mockPolicyRows();
      throw new Error(`Unexpected table ${table}`);
    },
  }));
  mockedCreateServiceRoleClient.mockReturnValue({ rpc: mockRpc, from: mockFrom } as never);
  mockedLatestAcknowledged.mockResolvedValue(input.snapshotHour.getTime());
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
  expect(mockedAck).toHaveBeenCalledWith(
    expect.anything(),
    input.snapshotHour.getTime(),
    'a'.repeat(64)
  );
});

it('rebases Turso mutable state before shadow capture when Supabase advanced during legacy mode', async () => {
  mockedMode.mockReturnValue('shadow');
  mockedLatestAcknowledged.mockResolvedValue(input.snapshotHour.getTime() - 900_000);
  mockLatestStateLimit.mockResolvedValue({
    data: [{ last_snapshot_ts: input.snapshotHour.toISOString() }],
    error: null,
  });
  mockStateRows.mockResolvedValue({
    data: [
      {
        provider: 'dia',
        symbol: 'ETH',
        chain_id: 1,
        last_snapshot_ts: input.snapshotHour.toISOString(),
        last_price: '2000.00000000',
        last_deviation_pct: '0.0000',
        last_data_age_seconds: 2,
        last_confidence: '0.9000',
        last_is_success: true,
        last_error_message: null,
      },
    ],
    error: null,
  });
  mockRpc.mockResolvedValue({ data: { hourlyWritten: 1, persistence: summary }, error: null });

  await expect(commitSnapshotDataSlot([input], input.snapshotHour)).resolves.toEqual({
    hourlyWritten: 1,
    persistence: summary,
  });

  expect(mockedReplaceProjection).toHaveBeenCalledWith(
    expect.anything(),
    [
      expect.objectContaining({
        provider: 'dia',
        lastSnapshotMs: input.snapshotHour.getTime(),
        lastPrice: 2_000,
      }),
    ],
    [expect.objectContaining({ policyKey: '__default__', confidenceChangeE4: 500 })]
  );
  expect(mockedReplaceProjection.mock.invocationCallOrder[0]).toBeLessThan(
    mockRpc.mock.invocationCallOrder[0]
  );
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
