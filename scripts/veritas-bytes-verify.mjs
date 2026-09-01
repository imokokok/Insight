// Independent verification of the VERITAS execution-receipt bytes package.
// Uses only viem's standard EIP-712 primitives — no Insight business code.
// Usage: node veritas-bytes-verify.mjs <bytes-package.json>
import fs from 'node:fs';
import { hashTypedData, verifyTypedData } from 'viem';

const file = process.argv[2];
if (!file) {
  console.error('usage: node veritas-bytes-verify.mjs <bytes-package.json>');
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
const r = pkg.receipt;

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
  if (!ok) failures += 1;
};

console.log('== 1. Receipt uid recompute (EIP-712 digest) ==');
const typed = {
  domain: r.eip712.domain,
  types: { [r.eip712.primaryType]: r.eip712.types[r.eip712.primaryType] },
  primaryType: r.eip712.primaryType,
  message: r.data,
};
const digest = hashTypedData(typed);
check(
  'uid == keccak(typedData)',
  digest === r.uid,
  `pkg=${r.uid.slice(0, 12)}… recomputed=${digest.slice(0, 12)}…`
);

console.log('== 2. Receipt signature recovery ==');
const sigOk = await verifyTypedData({
  address: r.attester,
  ...typed,
  signature: r.signature,
});
check('signature recovers attester', sigOk, `attester=${r.attester}`);

console.log('== 3. FAITHFUL tolerance is a signed field (the point they will check first) ==');
const fields = r.eip712.types[r.eip712.primaryType].map((f) => f.name);
const slipPos = fields.indexOf('maxSlippageBps');
const deltaPos = fields.indexOf('priceDeltaBps');
check(
  'maxSlippageBps inside signed struct',
  slipPos >= 0,
  `position ${slipPos + 1} of ${fields.length}`
);
check(
  'priceDeltaBps inside signed struct',
  deltaPos >= 0,
  `position ${deltaPos + 1} of ${fields.length}`
);

console.log('== 4. Verdict derives from the SIGNED values ==');
const delta = r.data.priceDeltaBps;
const maxSlip = r.data.maxSlippageBps;
check(
  'slippageSatisfied == |priceDeltaBps| <= maxSlippageBps (same signed values)',
  Math.abs(delta) <= maxSlip === r.data.slippageSatisfied,
  `delta=${delta}, max=${maxSlip}, pkg.slippageSatisfied=${r.data.slippageSatisfied}`
);
check(
  'executionStatus FAITHFUL consistent with slippage satisfied',
  r.data.slippageSatisfied === true && r.data.executionStatus === 'FAITHFUL'
);

console.log('== 5. Pre-trade gate envelopes (both) ==');
for (const [name, gate] of Object.entries(pkg.preTrade)) {
  if (name === 'note') continue;
  const gTyped = {
    domain: gate.eip712.domain,
    types: { [gate.eip712.primaryType]: gate.eip712.types[gate.eip712.primaryType] },
    primaryType: gate.eip712.primaryType,
    message: gate.data,
  };
  const gDigest = hashTypedData(gTyped);
  const gOk = await verifyTypedData({
    address: gate.attester,
    ...gTyped,
    signature: gate.signature,
  });
  check(
    `gate ${name}: uid recompute + signature`,
    gDigest === gate.uid && gOk,
    `uid ${gDigest.slice(0, 12)}…`
  );
}

console.log('== 6. Binding: receipt quotedPrice derived from gates (VERIFIED) ==');
check(
  'receipt bindingMode == VERIFIED and preTradeUid points at source gate uid',
  r.data.bindingMode === 'VERIFIED' && r.data.preTradeUid === pkg.preTrade.sourceGate.uid
);

console.log('== 7. On-chain existence check (publicnode, chain 1) ==');
try {
  const res = await fetch(pkg.onchain.rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify([
      { jsonrpc: '2.0', id: 1, method: 'eth_getTransactionByHash', params: [pkg.onchain.txHash] },
      { jsonrpc: '2.0', id: 2, method: 'eth_getBlockByNumber', params: [null, false] },
      { jsonrpc: '2.0', id: 3, method: 'eth_chainId', params: [] },
    ]),
  });
  const [txRes, headRes, chainRes] = await res.json();
  const tx = txRes.result;
  check(
    'tx exists on chain 1',
    !!tx && !txRes.error,
    tx ? `from=${tx.from} to=${tx.to}` : 'not found'
  );
  check(
    'tx block matches package blockNumber',
    !!tx && parseInt(tx.blockNumber, 16) === pkg.onchain.blockNumber,
    `pkg=${pkg.onchain.blockNumber}`
  );
  check('chainId == 1', chainRes.result === '0x1', `rpc chainId=${chainRes.result}`);
  if (headRes.result) {
    check(
      'block is within last 8 blocks (fresh)',
      pkg.onchain.blockNumber >= parseInt(headRes.result.number, 16) - 8,
      `head=${parseInt(headRes.result.number, 16)}`
    );
  }
} catch (e) {
  check('on-chain check', false, `fetch failed: ${e.message}`);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
