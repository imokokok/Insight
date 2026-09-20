// Public deterministic SIMULATION only. Not a production instrument, feed, or key.
export function rwaFixture(sdk, now = 1800000000) {
  const instrument = {
    schema: 'insight.rwa-instrument.v1',
    underlyingId: 'SIM:ACME',
    issuer: 'simulation-issuer',
    tokenChainId: 8453,
    tokenAddress: '0x' + '33'.repeat(20),
    venueMic: 'XNAS',
    kind: 'equity',
    currency: 'USD',
    priceBasis: 'underlying-spot',
    corporateActionVersion: 'sim-v1',
  };
  const instrumentId = sdk.rwaInstrumentId(instrument);
  const transaction = {
    chainId: 8453,
    from: '0x' + '11'.repeat(20),
    to: '0x' + '22'.repeat(20),
    data: '0x1234',
    value: '0',
    nonce: '7',
  };
  const request = {
    instrumentId,
    action: 'buy',
    amount: '1000000',
    call: {
      chainId: transaction.chainId,
      from: transaction.from,
      to: transaction.to,
      calldataHash: '0x56570de287d73cd1cb6092bb8fdee6173974955fdef345ae579ee9f475ea7432',
      value: '0',
      nonce: '7',
    },
  };
  const rule = {
    priceRequired: true,
    allowedSessions: ['REGULAR'],
    requiredEvidence: ['reserve', 'eligibility'],
  };
  const policy = {
    schema: 'insight.rwa-policy.v1',
    name: 'simulation-equity-strict-v1',
    instrumentId,
    environment: 'simulation',
    minProviders: 2,
    minIndependentGroups: 2,
    maxPriceAgeSeconds: 60,
    maxStateAgeSeconds: 60,
    maxSpreadBps: 100,
    reportTtlSeconds: 30,
    feeds: {
      'sim-feed-a': { group: 'sim-origin-a', derived: false, evidenceChainId: 1 },
      'sim-feed-b': { group: 'sim-origin-b', derived: false, evidenceChainId: 56 },
    },
    stateSources: ['sim-market'],
    evidenceSources: {
      reserve: ['sim-issuer'],
      eligibility: ['sim-eligibility'],
      redemption: ['sim-issuer'],
    },
    actions: {
      buy: structuredClone(rule),
      sell: structuredClone(rule),
      borrow: structuredClone(rule),
      collateralize: structuredClone(rule),
      liquidate: structuredClone(rule),
      redeem: {
        ...structuredClone(rule),
        requiredEvidence: ['reserve', 'eligibility', 'redemption'],
      },
      repay: { priceRequired: false, allowedSessions: [], requiredEvidence: ['eligibility'] },
    },
  };
  const prices = Object.entries(policy.feeds).map(([feedId, f], index) => ({
    feedId,
    instrumentId,
    evidenceChainId: f.evidenceChainId,
    currency: 'USD',
    priceBasis: instrument.priceBasis,
    corporateActionVersion: instrument.corporateActionVersion,
    session: 'REGULAR',
    priceE8: index ? '10010000000' : '10000000000',
    observedAt: now - 2,
    retrievedAt: now,
  }));
  const market = {
    instrumentId,
    mic: 'XNAS',
    source: 'sim-market',
    session: 'REGULAR',
    halt: 'CLEAR',
    corporateAction: 'CLEAR',
    observedAt: now - 2,
    validUntil: now + 45,
  };
  const evidence = ['reserve', 'eligibility', 'redemption'].map((kind) => ({
    kind,
    instrumentId,
    subject: kind === 'eligibility' ? transaction.from : instrumentId,
    source: kind === 'eligibility' ? 'sim-eligibility' : 'sim-issuer',
    status: 'OK',
    observedAt: now - 2,
    validUntil: now + 45,
  }));
  return { now, input: { instrument, request, prices, market, evidence }, policy, transaction };
}
export async function signRwaFixture(sdk, account, fixture) {
  const report = sdk.buildRwaReport(fixture.input, fixture.policy, fixture.now);
  return {
    proof: {
      report,
      digest: sdk.rwaReportDigest(report),
      signer: account.address,
      signature: await account.signTypedData(sdk.rwaSigningData(report)),
    },
    trust: {
      policy: structuredClone(fixture.policy),
      policyId: sdk.rwaPolicyId(fixture.policy),
      request: structuredClone(fixture.input.request),
      environment: fixture.policy.environment,
      keys: [
        {
          address: account.address,
          validFrom: fixture.now - 3600,
          validUntil: fixture.now + 3600,
          revoked: false,
        },
      ],
    },
  };
}
