import test from 'node:test';
import assert from 'node:assert/strict';
import { integrationDoctor } from '../../scripts/integration-doctor.mjs';

test('default doctor never sends credentials or requests a paid assessment', async () => {
  const calls = [];
  const result = await integrationDoctor({
    apiKey: 'private-fixture',
    fetcher: async (url, options) => {
      calls.push({ url, options });
      if (url.includes('capabilities')) return Response.json({ audience: 'fixture' });
      const status = url.includes('ready') ? 'ready' : 'ok';
      return Response.json(url.includes('oracleinsight') ? { data: { status } } : { status });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 5);
  assert.ok(calls.every((call) => Object.keys(call.options.headers).length === 0));
  assert.ok(!JSON.stringify(result).includes('private-fixture'));
});

test('explicit insufficient-freshness probe reports a failed readiness check, not a market-risk verdict', async () => {
  const result = await integrationDoctor({
    offer: 'insight',
    probe: true,
    apiKey: 'private-fixture',
    fetcher: async (url) => {
      if (url.includes('coverage'))
        return Response.json({
          data: { diagnostic: { freshnessStatus: 'INSUFFICIENT_FRESH_EVIDENCE', providers: [] } },
        });
      return Response.json({ data: { status: url.includes('ready') ? 'ready' : 'ok' } });
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.checks[2].diagnostic.freshnessStatus, 'INSUFFICIENT_FRESH_EVIDENCE');
  await assert.rejects(integrationDoctor({ samples: 99 }), /samples/);
  await assert.rejects(
    integrationDoctor({ offer: 'insight', insightUrl: 'http://remote.invalid' }),
    /HTTPS/
  );
});

test('explicit Robinhood probe verifies issuer/quorum boundaries and on-chain binding', async () => {
  const result = await integrationDoctor({
    offer: 'insight',
    probe: true,
    robinhoodSymbol: 'aapl',
    apiKey: 'private-fixture',
    fetcher: async (url) => {
      if (url.includes('/coverage')) {
        return Response.json({
          data: { diagnostic: { freshnessStatus: 'SUFFICIENT', providers: [] } },
        });
      }
      if (url.includes('/rwa/robinhood/context')) {
        return Response.json({
          data: {
            source: {
              type: 'issuer-first-party',
              independent: false,
              countsTowardOracleQuorum: false,
            },
            asset: { tokenSymbol: 'AAPL' },
            verification: {
              assetIdMatchesOnchain: true,
              assetDeploymentRegistered: true,
              quoteSymbolMatchesAsset: true,
              quoteDeploymentMatchesAsset: true,
              corporateActionSymbolsMatchAsset: true,
              corporateActionDeploymentsMatchAsset: true,
            },
            multiplier: {
              currentMatchesOnchain: true,
              onchain: { complete: true, rpcMode: 'configured' },
            },
            integrity: { status: 'CLEAR', reasonCodes: [], mayAuthorizeExecution: false },
          },
        });
      }
      return Response.json({ data: { status: url.includes('ready') ? 'ready' : 'ok' } });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 4);
  assert.equal(result.checks[3].diagnostic.assetIdMatchesOnchain, true);
  assert.equal(result.scope, 'PUBLIC_HEALTH_BILLABLE_COVERAGE_AND_ROBINHOOD_ISSUER_CONTEXT');
});
