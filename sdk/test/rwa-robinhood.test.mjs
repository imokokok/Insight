import assert from 'node:assert/strict';
import test from 'node:test';

import * as sdk from '../dist/index.js';

const NOW = 1_800_000_000;

function fixture() {
  const deployment = {
    contractAddress: `0x${'12'.repeat(20)}`,
    chainId: sdk.ROBINHOOD_CHAIN_ID,
    networkName: 'Robinhood Chain',
  };
  return {
    asset: {
      id: `0x${'34'.repeat(32)}`,
      tokenSymbol: 'AAPL',
      tokenName: 'Apple • Robinhood Token',
      deployments: [deployment],
      currentMultiplier: '1.001',
      pendingMultiplier: null,
      tradingCapabilities: {
        market: {
          whole: 'TRADING_STATUS_TRADABLE',
          fractional: 'TRADING_STATUS_TRADABLE',
        },
      },
      status: 'ASSET_STATUS_ACTIVE',
    },
    deployment,
    quote: {
      tokenSymbol: 'AAPL',
      deployments: [deployment],
      bid: '100',
      ask: '100.2',
      currency: 'USD',
      dailyTradingVolume: '1000',
      isTradingHalt: false,
      generatedAt: new Date((NOW - 5) * 1000).toISOString(),
    },
    corporateActions: [],
    onchain: {
      attempted: true,
      available: true,
      complete: true,
      rpcMode: 'configured',
      tokenUid: `0x${'34'.repeat(32)}`,
      currentMultiplierAtomic: '1001000000000000000',
      newMultiplierAtomic: '1001000000000000000',
      effectiveAt: 0,
      oraclePaused: false,
      verifiedAt: NOW,
      errorCode: null,
    },
    retrievedAt: NOW,
  };
}

test('builds non-quorum issuer context with exact multiplier normalization', () => {
  const context = sdk.buildRobinhoodRwaContext(fixture());
  assert.equal(context.source.type, 'issuer-first-party');
  assert.equal(context.source.independent, false);
  assert.equal(context.source.countsTowardOracleQuorum, false);
  assert.equal(context.quote.midpointUsd, '100.1');
  assert.equal(context.priceNormalization.tokenReferencePriceUsd, '100.2001');
  assert.equal(context.multiplier.currentMatchesOnchain, true);
  assert.equal(context.verification.assetIdMatchesOnchain, true);
  assert.equal(context.verification.assetDeploymentRegistered, true);
  assert.equal(context.verification.quoteSymbolMatchesAsset, true);
  assert.equal(context.verification.quoteDeploymentMatchesAsset, true);
  assert.equal(context.verification.corporateActionSymbolsMatchAsset, true);
  assert.equal(context.verification.corporateActionDeploymentsMatchAsset, true);
  assert.equal(context.integrity.status, 'CLEAR');
  assert.equal(context.integrity.mayAuthorizeExecution, false);
});

test('blocks pending corporate actions and multiplier changes', () => {
  const input = fixture();
  input.asset.pendingMultiplier = '1.01';
  input.asset.pendingMultiplierEffectiveTime = new Date((NOW + 3600) * 1000).toISOString();
  input.onchain.newMultiplierAtomic = '1010000000000000000';
  input.onchain.effectiveAt = NOW + 3600;
  input.corporateActions = [
    {
      id: `0x${'56'.repeat(32)}`,
      type: 'CORPORATE_ACTION_TYPE_CASH_DIVIDEND',
      status: 'CORPORATE_ACTION_STATUS_IN_PROGRESS',
      tokenSymbol: 'AAPL',
      deployments: [input.deployment],
      details: { cashDividend: { rate: '0.25' } },
    },
  ];
  const context = sdk.buildRobinhoodRwaContext(input);
  assert.equal(context.marketEvidence.corporateAction, 'PENDING');
  assert.equal(context.integrity.status, 'BLOCK');
  assert.ok(context.integrity.reasonCodes.includes('CORPORATE_ACTION_PENDING'));
  assert.ok(context.integrity.reasonCodes.includes('MULTIPLIER_UPDATE_PENDING'));
});

test('fails closed on stale quotes and multiplier mismatch', () => {
  const input = fixture();
  input.quote.generatedAt = new Date((NOW - 31) * 1000).toISOString();
  input.onchain.currentMultiplierAtomic = '1000000000000000000';
  const context = sdk.buildRobinhoodRwaContext(input);
  assert.equal(context.marketEvidence.halt, 'UNKNOWN');
  assert.equal(context.integrity.status, 'BLOCK');
  assert.ok(context.integrity.reasonCodes.includes('QUOTE_STALE'));
  assert.ok(context.integrity.reasonCodes.includes('MULTIPLIER_MISMATCH'));
});

test('fails closed on future quotes and issuer/on-chain identity mismatches', () => {
  const input = fixture();
  input.quote.generatedAt = new Date((NOW + 1) * 1000).toISOString();
  input.asset.deployments = [];
  input.quote.tokenSymbol = 'MSFT';
  input.quote.deployments = [{ ...input.deployment, contractAddress: `0x${'99'.repeat(20)}` }];
  input.corporateActions = [
    {
      id: `0x${'77'.repeat(32)}`,
      type: 'CORPORATE_ACTION_TYPE_CASH_DIVIDEND',
      status: 'CORPORATE_ACTION_STATUS_COMPLETED',
      tokenSymbol: 'NVDA',
      deployments: [{ ...input.deployment, contractAddress: `0x${'98'.repeat(20)}` }],
      details: { cashDividend: { rate: '0.25' } },
    },
  ];
  input.onchain.tokenUid = `0x${'88'.repeat(32)}`;
  const context = sdk.buildRobinhoodRwaContext(input);
  assert.equal(context.marketEvidence.halt, 'UNKNOWN');
  assert.equal(context.integrity.status, 'BLOCK');
  assert.ok(context.integrity.reasonCodes.includes('QUOTE_TIME_FUTURE'));
  assert.ok(context.integrity.reasonCodes.includes('ASSET_DEPLOYMENT_MISMATCH'));
  assert.ok(context.integrity.reasonCodes.includes('QUOTE_SYMBOL_MISMATCH'));
  assert.ok(context.integrity.reasonCodes.includes('QUOTE_DEPLOYMENT_MISMATCH'));
  assert.ok(context.integrity.reasonCodes.includes('CORPORATE_ACTION_SYMBOL_MISMATCH'));
  assert.ok(context.integrity.reasonCodes.includes('CORPORATE_ACTION_DEPLOYMENT_MISMATCH'));
  assert.ok(context.integrity.reasonCodes.includes('ASSET_ID_MISMATCH'));
});

test('marks partial on-chain verification as caution', () => {
  const input = fixture();
  input.onchain.complete = false;
  input.onchain.oraclePaused = null;
  input.onchain.errorCode = 'ROBINHOOD_ONCHAIN_READ_PARTIAL';
  const context = sdk.buildRobinhoodRwaContext(input);
  assert.equal(context.integrity.status, 'CAUTION');
  assert.ok(context.integrity.reasonCodes.includes('ONCHAIN_VERIFICATION_PARTIAL'));
});

test('typed client requests issuer context without treating it as an oracle query', async () => {
  let requestedUrl = '';
  const expected = { schema: sdk.ROBINHOOD_RWA_CONTEXT_SCHEMA };
  const client = new sdk.InsightClient({
    apiKey: 'test-key',
    baseUrl: 'https://insight.test',
    fetch: async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ success: true, data: expected }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  assert.deepEqual(await client.robinhoodRwaContext('AAPL', { verifyOnchain: false }), expected);
  assert.equal(
    requestedUrl,
    'https://insight.test/api/v1/rwa/robinhood/context?symbol=AAPL&verifyOnchain=false'
  );
});
