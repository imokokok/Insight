import { renderHook, act } from '@testing-library/react';

import { usePortfolioDetect } from './usePortfolioDetect';
import type { ProtocolDetection } from '@/lib/protocols/detection';

const SAMPLE_DETECTIONS: ProtocolDetection[] = [
  {
    protocolId: 'aave-v3-ethereum',
    name: 'Aave V3',
    chain: 'ethereum',
    supported: true,
    hasPosition: true,
    position: null,
    skippedAssets: [],
    error: null,
  },
  {
    protocolId: 'compound-v3-ethereum',
    name: 'Compound V3',
    chain: 'ethereum',
    supported: true,
    hasPosition: false,
    position: null,
    skippedAssets: [],
    error: null,
  },
];

const ADDRESS = '0x1111111111111111111111111111111111111111';

describe('usePortfolioDetect', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('sets detections on a successful scan', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { detections: SAMPLE_DETECTIONS } }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => usePortfolioDetect());

    await act(async () => {
      await result.current.detect(ADDRESS);
    });

    expect(result.current.detecting).toBe(false);
    expect(result.current.detectError).toBeNull();
    expect(result.current.detections).toHaveLength(2);
    expect(result.current.detectedAt).not.toBeNull();
  });

  it('rejects an invalid address without calling the API', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => usePortfolioDetect());

    await act(async () => {
      await result.current.detect('not-an-address');
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.detectError).toContain('0x');
    expect(result.current.detections).toBeNull();
  });

  it('surfaces a server / network error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: { message: 'boom' } }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => usePortfolioDetect());

    await act(async () => {
      await result.current.detect(ADDRESS);
    });

    expect(result.current.detectError).toBe('boom');
    expect(result.current.detections).toBeNull();
  });

  it('reset clears all state', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { detections: SAMPLE_DETECTIONS } }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => usePortfolioDetect());
    await act(async () => {
      await result.current.detect(ADDRESS);
    });
    expect(result.current.detections).not.toBeNull();

    act(() => result.current.reset());
    expect(result.current.detections).toBeNull();
    expect(result.current.detectError).toBeNull();
    expect(result.current.detectedAt).toBeNull();
  });
});
