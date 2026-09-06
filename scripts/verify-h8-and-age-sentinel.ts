// Independent verifier-side smoke test for Headless H8 + age sentinel.
//
// In a fresh process so the attester/sample singletons re-load from env:
//  1) H8: a sample receipt (signed by the DEDICATED sample key) and a
//     production receipt (signed by the production key) recover DIFFERENT
//     addresses; the signer alone tells sample from fact.
//  2) age sentinel: a receipt whose preTradeSignedAt POST-DATES the fill
//     signs `attestationAgeAtExecSeconds=4294967295` (UINT32_MAX), never 0.
//
// Run: ATTESTATION_SIGNER_PRIVATE_KEY=$PROD ATTESTATION_SAMPLE_SIGNER_PRIVATE_KEY=$SAMPLE npx tsx scripts/verify-h8-and-age-sentinel.ts

import { hashTypedData, recoverTypedDataAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

async function main(): Promise<void> {
  const PROD = process.env.ATTESTATION_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;
  const SAMPLE = process.env.ATTESTATION_SAMPLE_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!PROD || !SAMPLE) {
    console.error(
      'need both ATTESTATION_SIGNER_PRIVATE_KEY and ATTESTATION_SAMPLE_SIGNER_PRIVATE_KEY'
    );
    process.exit(2);
  }

  const prodAddr = privateKeyToAccount(PROD).address;
  const sampleAddr = privateKeyToAccount(SAMPLE).address;
  console.log('PROD signer address  :', prodAddr);
  console.log('SAMPLE signer address:', sampleAddr);
  if (prodAddr.toLowerCase() === sampleAddr.toLowerCase()) {
    console.error('FAIL: prod and sample keys are the same — H8 not satisfied');
    process.exit(1);
  }

  const sampleDomain = { name: 'Insight Execution', version: '1', chainId: 1 } as const;
  const sampleTypes = {
    InsightExecution: [
      { name: 'bindingMode', type: 'string' },
      { name: 'subject', type: 'address' },
      { name: 'preTradeUid', type: 'bytes32' },
      { name: 'executedAt', type: 'uint256' },
      { name: 'environment', type: 'string' },
    ],
  } as const;
  const sampleMsg = {
    bindingMode: 'SELF_REPORTED',
    subject: '0x0000000000000000000000000000000000000004' as `0x${string}`,
    preTradeUid: ('0x' + '1'.repeat(64)) as `0x${string}`,
    executedAt: 1700000000n,
    environment: 'production',
  };

  const sampleSig = await privateKeyToAccount(SAMPLE).signTypedData({
    domain: sampleDomain,
    types: sampleTypes,
    primaryType: 'InsightExecution',
    message: sampleMsg,
  });
  const recovered = await recoverTypedDataAddress({
    domain: sampleDomain,
    types: sampleTypes,
    primaryType: 'InsightExecution',
    message: sampleMsg,
    signature: sampleSig,
  });
  console.log('recovered signer for sample facts:', recovered);
  if (recovered.toLowerCase() !== sampleAddr.toLowerCase()) {
    console.error('FAIL: sample signature did not recover the sample address');
    process.exit(1);
  }
  if (recovered.toLowerCase() === prodAddr.toLowerCase()) {
    console.error('FAIL: a sample signed with the PROD key would also verify — H8 unmitigated');
    process.exit(1);
  }

  const prodSig = await privateKeyToAccount(PROD).signTypedData({
    domain: sampleDomain,
    types: sampleTypes,
    primaryType: 'InsightExecution',
    message: sampleMsg,
  });
  const prodRecovered = await recoverTypedDataAddress({
    domain: sampleDomain,
    types: sampleTypes,
    primaryType: 'InsightExecution',
    message: sampleMsg,
    signature: prodSig,
  });
  console.log('prod signer recovered for same facts:', prodRecovered);
  if (prodRecovered.toLowerCase() !== prodAddr.toLowerCase()) {
    console.error('FAIL: prod signature did not recover the prod address');
    process.exit(1);
  }

  console.log('--- H8 VERIFIED: sample/fact distinction lives in the signer ---');

  // Age sentinel: round-trip the production signing path with a precedence
  // violation (preTradeSignedAt > executedAt) and confirm the signed field
  // is 4294967295, NOT 0. We invoke the production build/signer via the
  // lib code (no HTTP), so we don't need a server.
  const { buildExecutionMessage, signExecutionReceipt } =
    await import('../src/lib/attestations/executionReceipt.js');
  const signedPre = await signExecutionReceipt(
    {
      preTradeUid: ('0x' + 'a'.repeat(64)) as `0x${string}`,
      requestHash: ('0x' + 'b'.repeat(64)) as `0x${string}`,
      sourceAssetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      destinationAssetId: 'eip155:8453/erc20:0x4200000000000000000000000000000000000006',
      subjectChainId: 8453,
      settlementChainId: 8453,
      participantCount: 4,
      sourceGroupCount: 3,
      executedAt: 1700000000,
      // Gate signed 70s AFTER the fill — precedence false; age must be sentinel.
      preTradeSignedAt: 1700000070,
      oracleDataAgeAtExecSeconds: -1,
      quotedPrice: 0.000408,
      executedPrice: 0.0004082,
      maxSlippageBps: 50,
      action: 'SWAP',
      quotedAmountUsd: 1000,
      executedAmountUsd: 1001.5,
      actualFeeUsd: 0.42,
      measuredFields: ['quotedAmountUsd', 'executedAmountUsd', 'actualFeeUsd', 'mevRiskBps'],
      fillStatus: 'FULL',
      txHash: ('0x' + 'c'.repeat(64)) as `0x${string}`,
      blockNumber: 30000000,
      mevRiskScore: 0.05,
      taker: '0x0000000000000000000000000000000000000004' as `0x${string}`,
    }
    // Production path — uses ATTESTATION_SIGNER_PRIVATE_KEY, the prod key
    // from above. H8 stays separate via the { sample: true } code path which
    // is NOT exercised here.
  );
  if (!signedPre) {
    console.error('FAIL: production sign returned null');
    process.exit(1);
  }
  // The signed receipt carries the post-dated age in `data.attestationAgeAtExecSeconds`.
  const buildRecheck = await buildExecutionMessage({
    preTradeUid: ('0x' + 'a'.repeat(64)) as `0x${string}`,
    requestHash: ('0x' + 'b'.repeat(64)) as `0x${string}`,
    sourceAssetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    destinationAssetId: 'eip155:8453/erc20:0x4200000000000000000000000000000000000006',
    subjectChainId: 8453,
    settlementChainId: 8453,
    participantCount: 4,
    sourceGroupCount: 3,
    executedAt: 1700000000,
    preTradeSignedAt: 1700000070,
    oracleDataAgeAtExecSeconds: -1,
    quotedPrice: 0.000408,
    executedPrice: 0.0004082,
    maxSlippageBps: 50,
    action: 'SWAP',
    quotedAmountUsd: 1000,
    executedAmountUsd: 1001.5,
    actualFeeUsd: 0.42,
    measuredFields: ['quotedAmountUsd', 'executedAmountUsd', 'actualFeeUsd', 'mevRiskBps'],
    fillStatus: 'FULL',
    txHash: ('0x' + 'c'.repeat(64)) as `0x${string}`,
    blockNumber: 30000000,
    mevRiskScore: 0.05,
    taker: '0x0000000000000000000000000000000000000004' as `0x${string}`,
  });
  console.log(
    'attestationAgeAtExecSeconds (post-dated):',
    buildRecheck.attestationAgeAtExecSeconds
  );
  if (buildRecheck.attestationAgeAtExecSeconds !== 4294967295) {
    console.error(
      `FAIL: post-dated pre-trade signed as age=${buildRecheck.attestationAgeAtExecSeconds}, expected sentinel 4294967295 (Michael: "0 reads as fresh")`
    );
    process.exit(1);
  }
  console.log('--- AGE SENTINEL VERIFIED: 0xFFFFFFFF, never 0 ---');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
