// Independent verification of the VERITAS execution-receipt bytes package.
// Uses only viem's standard EIP-712 primitives — no Insight business code.
// Schema-version aware: checks v1/v2/v3 packages; the v3-only claims (F1-F7)
// run only when the receipt is v3.
// Usage: node veritas-bytes-verify.mjs <bytes-package.json>
import fs from 'node:fs';
import { hashTypedData, verifyTypedData, keccak256 } from 'viem';

const file = process.argv[2];
if (!file) {
  console.error('usage: node veritas-bytes-verify.mjs <bytes-package.json>');
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
const r = pkg.receipt;
const version = Number(r.data.schemaVersion) || 0;
const v3 = version >= 3;

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
  if (!ok) failures += 1;
};
const field = (d, ...names) => {
  for (const n of names) {
    if (d[n] !== undefined && d[n] !== null) return d[n];
  }
  return undefined;
};

console.log(`package schemaVersion=${version}${v3 ? ' (v3, 43-field layout)' : ''}`);

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

console.log('== 3. Tolerance is a signed field (the point they will check first) ==');
const fields = r.eip712.types[r.eip712.primaryType].map((f) => f.name);
for (const name of ['maxSlippageBps', 'priceDeltaBps']) {
  const pos = fields.indexOf(name);
  check(`${name} inside signed struct`, pos >= 0, `position ${pos + 1} of ${fields.length}`);
}
const statusField = v3 ? 'priceExecutionStatus' : 'executionStatus';
check(
  `verdict field is ${statusField} and signed`,
  fields.includes(statusField),
  v3 ? 'F2: scope travels in the name (PRICE only)' : ''
);

console.log('== 4. Verdict derives from the SIGNED values ==');
const delta = r.data.priceDeltaBps;
const maxSlip = r.data.maxSlippageBps;
check(
  'slippageSatisfied == |priceDeltaBps| <= maxSlippageBps (same signed values)',
  Math.abs(delta) <= maxSlip === r.data.slippageSatisfied,
  `delta=${delta}, max=${maxSlip}, pkg.slippageSatisfied=${r.data.slippageSatisfied}`
);
const verdict = r.data.priceExecutionStatus ?? r.data.executionStatus;
check(
  `${statusField} == independent recompute from signed numbers`,
  (r.data.slippageSatisfied === true && verdict === 'FAITHFUL') ||
    (r.data.slippageSatisfied === false && verdict !== 'FAITHFUL'),
  `signed verdict=${verdict}`
);
check(
  'independent expected status (package onchain) agrees',
  verdict === pkg.onchain.independentExpectedStatus,
  `pkg recompute=${pkg.onchain.independentExpectedStatus}`
);

console.log('== 5. Pre-trade gate envelopes (both) ==');
for (const [name, gate] of Object.entries(pkg.preTrade)) {
  if (!gate || typeof gate !== 'object' || !gate.eip712) continue;
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

if (v3) {
  console.log('== 7. v3 F1: both gates are committed, in order ==');
  const destUid = r.data.destinationPreTradeUid;
  const destCommitted =
    typeof destUid === 'string' &&
    destUid !== '0x' + '0'.repeat(64) &&
    destUid.toLowerCase() === pkg.preTrade.destinationGate.uid.toLowerCase();
  check(
    'destinationPreTradeUid == destination gate uid',
    destCommitted,
    `dest=${String(destUid).slice(0, 12)}…`
  );
  const presentedUids = [r.data.preTradeUid.toLowerCase(), destUid.toLowerCase()];
  const joined = presentedUids.map((u) => u.slice(2)).join('');
  const expectedHash = keccak256('0x' + joined);
  check(
    'preTradeUidsHash == keccak256(concat(sourceUid, destUid))',
    String(r.data.preTradeUidsHash).toLowerCase() === expectedHash.toLowerCase(),
    `pkg=${String(r.data.preTradeUidsHash).slice(0, 12)}… recomputed=${expectedHash.slice(0, 12)}…`
  );

  console.log('== 8. v3 F6: requestHash openable from the canonical preimage ==');
  const rp = pkg.requestPreimage;
  if (rp && rp.message && rp.domain && rp.types) {
    const reqDigest = hashTypedData({
      domain: rp.domain,
      types: { [rp.primaryType]: rp.types[rp.primaryType] },
      primaryType: rp.primaryType,
      message: {
        subjectChainId: BigInt(rp.message.subjectChainId),
        sourceAssetId: rp.message.sourceAssetId,
        destinationAssetId: rp.message.destinationAssetId,
        action: rp.message.action,
        tradeAmountUsd: BigInt(rp.message.tradeAmountUsd) * 1000000n,
      },
    });
    check(
      'requestHash recomputes from preimage (scaled x1e6) and matches gate + receipt',
      reqDigest.toLowerCase() === r.data.requestHash.toLowerCase() &&
        reqDigest.toLowerCase() === pkg.preTrade.sourceGate.data.requestHash.toLowerCase(),
      `recomputed=${reqDigest.slice(0, 12)}…`
    );
  } else {
    check('request preimage present', false);
  }
  check(
    'subject/taker/claimRole signed: subject defaults to taker, claim is third-party observation',
    r.data.subject === r.data.taker && r.data.claimRole === 'THIRD_PARTY_OBSERVATION',
    `subject=${String(r.data.subject).slice(0, 10)}… taker=${String(r.data.taker).slice(0, 10)}…`
  );

  console.log('== 9. v3 F2/F3/F4/F5/F7 disclosures are signed ==');
  check(
    'measuredFieldsHash is the empty-set hash (keccak256 of "")',
    String(r.data.measuredFieldsHash).toLowerCase() === keccak256('0x').toLowerCase(),
    `pkg=${String(r.data.measuredFieldsHash).slice(0, 12)}…`
  );
  check(
    "quoteVenueIndependent == false (quote is the venue's own mid)",
    r.data.quoteVenueIndependent === false
  );
  check(
    'quoteBasis == PREV_BLOCK_CLOSE and quoteBlockNumber == pre-swap block',
    r.data.quoteBasis === 'PREV_BLOCK_CLOSE' &&
      Number(r.data.quoteBlockNumber) === pkg.onchain.preSwapBlockNumber
  );
  check('priceScale == 8 (x1e8)', Number(r.data.priceScale) === 8);
  check(
    'v3 domain carries environment (F7) and no placeholder verifyingContract',
    typeof r.eip712.domain.environment === 'string' && !('verifyingContract' in r.eip712.domain),
    `environment=${r.eip712.domain.environment}`
  );
  check(
    'two distinct age fields (attestation vs price state)',
    Number(r.data.attestationAgeAtExecSeconds) > 0 &&
      Number(r.data.priceStateAgeAtExecSeconds) > 0 &&
      r.data.attestationAgeAtExecSeconds !== r.data.priceStateAgeAtExecSeconds,
    `attestationAge=${r.data.attestationAgeAtExecSeconds}s priceStateAge=${r.data.priceStateAgeAtExecSeconds}s`
  );
  check(
    'priceStateAgeAtExecSeconds == executedAt - preSwapBlockTs (on-chain derivable)',
    Number(r.data.priceStateAgeAtExecSeconds) ===
      pkg.onchain.executedAt - pkg.onchain.preSwapBlockTs
  );

  console.log('== 10. v3 closed loop closes only with BOTH gates ==');
  check(
    'self-verification closed the loop with destination gate bound',
    pkg.selfVerification.verifyExecutionPair.pairedValid === true &&
      pkg.selfVerification.verifyExecutionPair.binding.destinationPreTradeUidMatch === true &&
      pkg.selfVerification.verifyExecutionPair.binding.preTradeUidsHashMatch === true &&
      String(pkg.selfVerification.verifyExecutionPair.closedLoopStatus).startsWith('PRICE_CLOSED_'),
    `status=${pkg.selfVerification.verifyExecutionPair.closedLoopStatus}`
  );
}

console.log('== 11. On-chain existence check (publicnode, chain 1) ==');
try {
  const reqs = [
    { jsonrpc: '2.0', id: 1, method: 'eth_getTransactionByHash', params: [pkg.onchain.txHash] },
    { jsonrpc: '2.0', id: 2, method: 'eth_getBlockByNumber', params: [null, false] },
    { jsonrpc: '2.0', id: 3, method: 'eth_chainId', params: [] },
  ];
  if (v3 && Number.isInteger(pkg.onchain.preSwapBlockNumber)) {
    reqs.push({
      jsonrpc: '2.0',
      id: 4,
      method: 'eth_getBlockByNumber',
      params: ['0x' + pkg.onchain.preSwapBlockNumber.toString(16), false],
    });
  }
  const res = await fetch(pkg.onchain.rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(reqs),
  });
  const [txRes, headRes, chainRes, preSwapRes] = await res.json();
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
  if (v3 && preSwapRes && preSwapRes.result) {
    const ts = parseInt(preSwapRes.result.timestamp, 16);
    check(
      'preSwapBlock timestamp matches package (age is on-chain derivable)',
      ts === pkg.onchain.preSwapBlockTs,
      `pkg=${pkg.onchain.preSwapBlockTs} chain=${ts}`
    );
  }
} catch (e) {
  check('on-chain check', false, `fetch failed: ${e.message}`);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
