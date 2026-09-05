import assert from 'node:assert/strict';
import test from 'node:test';

import { InsightGuard } from '../dist/index.js';

const sourceId = 'eip155:1/erc20:0x0000000000000000000000000000000000000001';
const destinationId = 'eip155:1/erc20:0x0000000000000000000000000000000000000002';
const hash = `0x${'a'.repeat(64)}`;
const txHash = `0x${'b'.repeat(64)}`;

function api(data, status = 200) {
  return new Response(JSON.stringify({ success: status < 300, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function preTrade(asset, verdict = 'PASS') {
  const source = asset === 'ETH';
  return {
    verdict,
    consensusPrice: source ? 2500 : 1,
    maxDeviationPct: 0.1,
    crossProviderAgreement: 0.99,
    recommendedMaxPositionUsd: 100000,
    participantCount: 3,
    warnings: [],
    contributingFactors: [],
    evaluatedAt: '2026-09-05T00:00:00.000Z',
    attestation: {
      uid: `0x${(source ? '1' : '2').repeat(64)}`,
      schemaVersion: 3,
      attester: '0x0000000000000000000000000000000000000003',
      signedAt: '2026-09-05T00:00:00.000Z',
      data: {
        sourceAssetId: source ? sourceId : destinationId,
        destinationAssetId: source ? destinationId : sourceId,
        subjectChainId: 1,
        participantCount: 3,
        sourceGroupCount: 2,
        requestHash: hash,
        consensusPrice: source ? 250000000000 : 100000000,
        checkedAt: 1757030400,
      },
    },
  };
}

const sourceRequest = {
  asset: 'ETH',
  destinationAsset: 'USDC',
  chainId: 1,
  action: 'swap',
  tradeAmountUsd: 1000,
};
const destinationRequest = {
  asset: 'USDC',
  destinationAsset: 'ETH',
  chainId: 1,
  action: 'swap',
  tradeAmountUsd: 1000,
};

test('executeSwap never submits a trade when the source pre-trade gate blocks', async () => {
  let submitted = false;
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async () => api(preTrade('ETH', 'BLOCK')),
  });

  const result = await guard.executeSwap({
    source: sourceRequest,
    destination: destinationRequest,
    receipt: { settlementChainId: 1 },
    submitTransaction: async () => {
      submitted = true;
      return { txHash };
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.stage, 'source_pre_trade');
  assert.equal(submitted, false);
});

test('executeSwap submits only after two gates and issues a verified receipt', async () => {
  const requests = [];
  const guard = new InsightGuard({
    apiKey: 'ins_test',
    fetch: async (url, init) => {
      const parsed = new URL(url);
      requests.push({ path: parsed.pathname, body: init?.body });
      if (parsed.pathname.endsWith('/safety/pre-trade')) {
        return api(preTrade(parsed.searchParams.get('asset')));
      }
      assert.equal(parsed.pathname, '/api/v1/execution/attestation/issue');
      return api({
        attestation: { uid: `0x${'3'.repeat(64)}`, schemaVersion: 4, attester: '0x4', data: {} },
        executionStatus: 'FAITHFUL',
        bindingMode: 'VERIFIED',
        binding: {},
      });
    },
  });

  const result = await guard.executeSwap({
    source: sourceRequest,
    destination: destinationRequest,
    receipt: { settlementChainId: 1, maxSlippageBps: 50 },
    submitTransaction: async () => ({ txHash }),
  });

  assert.equal(result.status, 'executed');
  assert.equal(result.receipt.bindingMode, 'VERIFIED');
  assert.deepEqual(
    requests.map((request) => request.path),
    ['/api/v1/safety/pre-trade', '/api/v1/safety/pre-trade', '/api/v1/execution/attestation/issue']
  );
  const receiptPayload = JSON.parse(requests[2].body);
  assert.equal(receiptPayload.txHash, txHash);
  assert.equal(receiptPayload.preTradeAttestations.source.uid, preTrade('ETH').attestation.uid);
  assert.equal(
    receiptPayload.preTradeAttestations.destination.uid,
    preTrade('USDC').attestation.uid
  );
});
