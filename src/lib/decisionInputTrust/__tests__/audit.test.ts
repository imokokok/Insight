import { createServiceRoleClient } from '@/lib/supabase/server';

import { recordDecisionInputExecutionGate } from '../audit';

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

const mockClient = createServiceRoleClient as jest.MockedFunction<typeof createServiceRoleClient>;
const sourceUid = `0x${'11'.repeat(32)}`;
const destinationUid = `0x${'22'.repeat(32)}`;
const gate = {
  schemaVersion: 1 as const,
  status: 'SUFFICIENT' as const,
  evaluatedAt: '2026-10-13T06:30:00.000Z',
  sourceAssessmentStatus: 'SUFFICIENT' as const,
  destinationAssessmentStatus: 'SUFFICIENT' as const,
  routeQuote: {
    price: 2000,
    observedAt: '2026-10-13T06:29:59.000Z',
    ageSeconds: 1,
    oracleCrossRate: 2000,
    deviationBps: 0,
    maxDeviationBps: 50,
  },
};

describe('recordDecisionInputExecutionGate', () => {
  it('stores the same combined gate against both signed pre-trade UIDs', async () => {
    const select = jest.fn().mockResolvedValue({
      data: [{ attestation_uid: sourceUid }, { attestation_uid: destinationUid }],
      error: null,
    });
    const inFilter = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ in: inFilter });
    const from = jest.fn().mockReturnValue({ update });
    mockClient.mockReturnValue({ from } as never);

    await recordDecisionInputExecutionGate(sourceUid, destinationUid, gate);

    expect(from).toHaveBeenCalledWith('pre_trade_checks');
    expect(update).toHaveBeenCalledWith({ decision_input_gate: gate });
    expect(inFilter).toHaveBeenCalledWith('attestation_uid', [sourceUid, destinationUid]);
    expect(select).toHaveBeenCalledWith('attestation_uid');
  });

  it('throws when the audit rows cannot be updated', async () => {
    const select = jest.fn().mockResolvedValue({ data: null, error: { message: 'offline' } });
    const inFilter = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ in: inFilter });
    mockClient.mockReturnValue({ from: jest.fn(() => ({ update })) } as never);

    await expect(recordDecisionInputExecutionGate(sourceUid, destinationUid, gate)).rejects.toThrow(
      /persistence failed/
    );
  });

  it('throws if either pre-trade UID has no audit row', async () => {
    const select = jest.fn().mockResolvedValue({
      data: [{ attestation_uid: sourceUid }],
      error: null,
    });
    const inFilter = jest.fn().mockReturnValue({ select });
    const update = jest.fn().mockReturnValue({ in: inFilter });
    mockClient.mockReturnValue({ from: jest.fn(() => ({ update })) } as never);

    await expect(recordDecisionInputExecutionGate(sourceUid, destinationUid, gate)).rejects.toThrow(
      /could not find both/
    );
  });

  it('rejects malformed or duplicate UIDs before writing', async () => {
    const from = jest.fn();
    mockClient.mockReturnValue({ from } as never);

    await expect(recordDecisionInputExecutionGate('invalid', destinationUid, gate)).rejects.toThrow(
      /two distinct signed pre-trade UIDs/
    );
    await expect(recordDecisionInputExecutionGate(sourceUid, sourceUid, gate)).rejects.toThrow(
      /two distinct signed pre-trade UIDs/
    );
    expect(from).not.toHaveBeenCalled();
  });
});
