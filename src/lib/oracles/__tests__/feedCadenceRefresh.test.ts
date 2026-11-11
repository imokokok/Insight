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

  describe('TURSO_FEED_CADENCE_MODE branch', () => {
    const ORIGINAL_MODE = process.env.TURSO_FEED_CADENCE_MODE;

    afterEach(() => {
      if (ORIGINAL_MODE === undefined) delete process.env.TURSO_FEED_CADENCE_MODE;
      else process.env.TURSO_FEED_CADENCE_MODE = ORIGINAL_MODE;
      jest.resetModules();
    });

    it('defaults to the legacy Supabase RPC when the mode is unset', async () => {
      delete process.env.TURSO_FEED_CADENCE_MODE;
      const rpc = jest.fn().mockResolvedValue({
        data: [{ updated_count: 5, scanned_count: 5 }],
        error: null,
      });

      await expect(updateAllFeedStalenessBaselines({ rpc } as never)).resolves.toBe(5);
      expect(rpc).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown mode instead of silently picking a plane', async () => {
      process.env.TURSO_FEED_CADENCE_MODE = 'shadow';
      const rpc = jest.fn();

      await expect(updateAllFeedStalenessBaselines({ rpc } as never)).rejects.toThrow(
        'TURSO_FEED_CADENCE_MODE must be supabase or turso'
      );
      expect(rpc).not.toHaveBeenCalled();
    });

    it('routes to the Turso raw stream when the mode is turso', async () => {
      process.env.TURSO_FEED_CADENCE_MODE = 'turso';
      jest.doMock('@/lib/turso/price/client', () => ({
        getTursoPriceClient: jest.fn(() => ({ __tursoClient: true })),
      }));
      jest.doMock('@/lib/turso/price/cadenceRepository', () => ({
        refreshTursoFeedCadenceBaselines: jest.fn().mockResolvedValue({
          updated: 42,
          scanned: 42,
        }),
      }));

      // Re-import with the mocks applied so the branch binds the fakes.
      const { updateAllFeedStalenessBaselines: branchRunner } =
        await import('@/lib/oracles/feedCadence');
      const { refreshTursoFeedCadenceBaselines } =
        await import('@/lib/turso/price/cadenceRepository');

      const rpc = jest.fn();
      await expect(branchRunner({ rpc } as never)).resolves.toBe(42);
      expect(refreshTursoFeedCadenceBaselines).toHaveBeenCalledTimes(1);
      expect(refreshTursoFeedCadenceBaselines).toHaveBeenCalledWith({ __tursoClient: true });
      expect(rpc).not.toHaveBeenCalled();
    });
  });
});
