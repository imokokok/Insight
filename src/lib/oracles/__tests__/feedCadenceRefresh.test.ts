import { updateAllFeedStalenessBaselines } from '@/lib/oracles/feedCadence';

describe('updateAllFeedStalenessBaselines', () => {
  it('refreshes every active feed through one set-based RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ updated_count: 1250, scanned_count: 1250 }],
      error: null,
    });

    const updated = await updateAllFeedStalenessBaselines({ rpc } as never);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('refresh_oracle_feed_cadence_baselines', {
      p_lookback_hours: 48,
      p_min_samples: 12,
    });
    expect(updated).toBe(1250);
  });

  it('accepts bigint counts serialized as strings', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ updated_count: '1000', scanned_count: '1000' }],
      error: null,
    });

    await expect(updateAllFeedStalenessBaselines({ rpc } as never)).resolves.toBe(1000);
  });

  it('fails the workflow when the database refresh fails', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'function is not installed' },
    });

    await expect(updateAllFeedStalenessBaselines({ rpc } as never)).rejects.toThrow(
      'Feed-cadence baseline RPC failed: function is not installed'
    );
  });

  it('rejects an empty response instead of reporting zero updates', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null });

    await expect(updateAllFeedStalenessBaselines({ rpc } as never)).rejects.toThrow(
      'returned no result'
    );
  });

  it('rejects impossible counts instead of reporting a false success', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [{ updated_count: 1001, scanned_count: 1000 }],
      error: null,
    });

    await expect(updateAllFeedStalenessBaselines({ rpc } as never)).rejects.toThrow(
      'invalid scanned count'
    );
  });
});
