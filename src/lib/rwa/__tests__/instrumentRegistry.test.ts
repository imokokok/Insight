import { getRobinhoodInstrumentAdmission } from '../instrumentRegistry';
import { getRobinhoodRwaContext } from '../robinhoodClient';

jest.mock('../robinhoodClient', () => ({
  getRobinhoodRwaContext: jest.fn(),
}));

const mockedContext = jest.mocked(getRobinhoodRwaContext);

beforeEach(() => {
  mockedContext.mockReset();
  mockedContext.mockResolvedValue({
    schema: 'insight.robinhood-rwa-context.v1',
    retrievedAt: 1_800_000_000,
    asset: {
      id: '0x00000000000000000000000000000000c2425be3658540dd8e2424cbf3c5c649',
      tokenSymbol: 'AAPL',
      isin: 'US0378331005',
      deployment: {
        chainId: 4663,
        contractAddress: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9',
      },
    },
    integrity: {
      status: 'CLEAR',
      reasonCodes: [],
      mayAuthorizeExecution: false,
    },
  } as never);
});

it('loads the pinned registry and cross-checks current issuer identity', async () => {
  const admission = await getRobinhoodInstrumentAdmission('aapl', {
    verifyOnchain: false,
    now: () => 1_800_000_001_000,
  });

  expect(mockedContext).toHaveBeenCalledWith('aapl', {
    verifyOnchain: false,
    now: expect.any(Function),
  });
  expect(admission).toMatchObject({
    schema: 'insight.rwa-instrument-admission.v1',
    registryVersion: '2026-09-21.shadow.1',
    evaluatedAt: 1_800_000_001,
    entry: {
      status: 'SHADOW',
      instrument: {
        underlyingId: 'figi-share-class:BBG001S5N8V8',
        venueMic: 'XNAS',
      },
    },
    observedIssuerBinding: {
      symbol: 'AAPL',
      isin: 'US0378331005',
      chainId: 4663,
      tokenAddress: '0xaf3d76f1834a1d425780943c99ea8a608f8a93f9',
    },
    evaluation: {
      identityStatus: 'MATCH',
      reasonCodes: ['REGISTRY_ENTRY_NOT_ACTIVE'],
      productionIdentityAdmitted: false,
      countsTowardOracleQuorum: false,
      mayAuthorizeExecution: false,
    },
  });
});

it('fails closed when the issuer deployment drifts from the committed registry', async () => {
  mockedContext.mockResolvedValueOnce({
    schema: 'insight.robinhood-rwa-context.v1',
    retrievedAt: 1_800_000_000,
    asset: {
      id: '0x00000000000000000000000000000000c2425be3658540dd8e2424cbf3c5c649',
      tokenSymbol: 'AAPL',
      isin: 'US0378331005',
      deployment: { chainId: 4663, contractAddress: `0x${'99'.repeat(20)}` },
    },
    integrity: { status: 'BLOCK', reasonCodes: [], mayAuthorizeExecution: false },
  } as never);

  const admission = await getRobinhoodInstrumentAdmission('AAPL', {
    verifyOnchain: false,
  });
  expect(admission.evaluation.identityStatus).toBe('MISMATCH');
  expect(admission.evaluation.reasonCodes).toContain('REGISTRY_DEPLOYMENT_MISMATCH');
  expect(admission.evaluation.productionIdentityAdmitted).toBe(false);
});
