import { renderHook, act } from '@testing-library/react';

import type { PositionCriticalResult, PositionInput } from '@/lib/protocols/protocolHealth';

import { useProtocolHealth } from './useProtocolHealth';

const POSITION: PositionInput = {
  protocolId: 'aave-v3-eth',
  collaterals: [{ symbol: 'ETH', amount: 1 }],
  borrows: [{ symbol: 'USDC', amount: 1000 }],
};

function makeResult(hf: number, crit: number): PositionCriticalResult {
  return {
    protocolId: 'aave-v3-eth',
    protocolName: 'Aave V3',
    chain: 'ethereum',
    collaterals: [],
    borrows: [],
    totalCollateralValue: 0,
    totalAdjustedCollateralValue: 0,
    totalBorrowValue: 0,
    currentCollateralRatio: 0,
    currentHealthFactor: hf,
    assetDeviations: [],
    jointDeviation: {
      symbol: 'JOINT',
      criticalDeviationPercent: crit,
      criticalPrice: 0,
      direction: 'down',
      description: '',
    },
    deviationRatios: {},
    worstDeviation: {
      symbol: 'ETH',
      criticalDeviationPercent: crit,
      criticalPrice: 0,
      direction: 'down',
      description: '',
    },
    pricePoints: [],
    safetyBuffer: {
      overallLevel: 'safe',
      bufferPercent: 0,
      theoreticalBufferPercent: 0,
      oracleAvgDeviationPercent: 0,
      liveDepegRiskPercent: 0,
      liveDepegBreakdown: {},
      bandHalfWidthPercent: 0,
      bandUnknown: false,
      description: '',
      recommendations: [],
    },
    oracleWarnings: [],
    deviationScenarios: [],
    lastUpdated: Date.now(),
    collateralSymbol: 'ETH',
    collateralAmount: 1,
    collateralPrice: 0,
    borrowSymbol: 'USDC',
    borrowAmount: 1000,
    borrowPrice: 0,
    liquidationThreshold: 1.2,
    criticalDeviationPercent: crit,
    criticalCollateralPrice: 0,
    liquidationPriceBand: {
      center: 0,
      lower: 0,
      upper: 0,
      adversePercent: 0,
      favorablePercent: 0,
      unknown: false,
    },
  } as PositionCriticalResult;
}

function jsonResponse(ok: boolean, status: number, body: unknown) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe('useProtocolHealth', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('calculate sets result and clears error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(true, 200, { success: true, data: makeResult(1.5, -40) })
    );

    const { result } = renderHook(() => useProtocolHealth());
    await act(async () => {
      await result.current.calculate(POSITION);
    });

    expect(result.current.result?.currentHealthFactor).toBe(1.5);
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/protocol-health',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('calculate failure clears result and sets error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(false, 500, { success: false, error: { message: 'boom' } })
    );

    const { result } = renderHook(() => useProtocolHealth());
    await act(async () => {
      await result.current.calculate(POSITION);
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe('boom');
  });

  it('refresh (keepResultOnError) updates result and does not set error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(true, 200, { success: true, data: makeResult(1.3, -35) })
    );
    const { result } = renderHook(() => useProtocolHealth());
    await act(async () => {
      await result.current.calculate(POSITION);
    });
    expect(result.current.result?.currentHealthFactor).toBe(1.3);

    // Prices moved → new health factor after refresh.
    fetchMock.mockResolvedValue(
      jsonResponse(true, 200, { success: true, data: makeResult(1.1, -30) })
    );
    await act(async () => {
      await result.current.calculate(POSITION, { keepResultOnError: true });
    });

    expect(result.current.result?.currentHealthFactor).toBe(1.1);
    expect(result.current.refreshError).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('refresh (keepResultOnError) failure keeps previous result and sets refreshError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(true, 200, { success: true, data: makeResult(1.5, -40) })
    );
    const { result } = renderHook(() => useProtocolHealth());
    await act(async () => {
      await result.current.calculate(POSITION);
    });
    const saved = result.current.result;

    fetchMock.mockResolvedValue(
      jsonResponse(false, 502, { success: false, error: { message: 'timeout' } })
    );
    await act(async () => {
      await result.current.calculate(POSITION, { keepResultOnError: true });
    });

    // Previous (good) result stays on screen; only refreshError is set.
    expect(result.current.result).toBe(saved);
    expect(result.current.result?.currentHealthFactor).toBe(1.5);
    expect(result.current.refreshError).toBe('timeout');
    expect(result.current.error).toBeNull();
  });
});
