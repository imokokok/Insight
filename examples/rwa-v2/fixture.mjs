// Public deterministic SIMULATION only; not production keys, deployments or feeds.
import { encodeFunctionData, keccak256 } from 'viem';

import { rwaFixture } from '../rwa-v1/fixture.mjs';

export function rwaV2Fixture(sdk, now = 1800000000) {
  const f = rwaFixture(sdk, now);
  const quote = '0x' + '44'.repeat(20),
    receiver = '0x' + '55'.repeat(20);
  f.transaction.data = encodeFunctionData({
    abi: sdk.RWA_SWAP_ABI,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: quote,
        tokenOut: f.input.instrument.tokenAddress,
        fee: 3000,
        recipient: receiver,
        deadline: BigInt(now + 120),
        amountIn: BigInt(f.input.request.amount),
        amountOutMinimum: 900000n,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  f.input.request.call.calldataHash = keccak256(f.transaction.data);
  f.callProfile = {
    schema: 'insight.rwa-call-profile.v1',
    adapter: 'uniswap-v3-exact-input-single',
    chainId: 8453,
    target: f.transaction.to,
    instrumentId: f.input.request.instrumentId,
    quoteToken: quote,
    allowedFees: [3000],
  };
  f.receiverEvidence = {
    ...f.input.evidence.find((e) => e.kind === 'eligibility'),
    subject: receiver,
  };
  return f;
}
export async function signRwaV2Fixture(sdk, account, f, sequence = '0', previousDigest = null) {
  const report = sdk.buildRwaReportV2(f.input, f.policy, f.now, {
    sequence,
    previousDigest,
    transaction: f.transaction,
    callProfile: f.callProfile,
    receiverEvidence: f.receiverEvidence,
  });
  return {
    proof: {
      report,
      digest: sdk.rwaV2ReportDigest(report),
      signer: account.address,
      signature: await account.signTypedData(sdk.rwaV2SigningData(report)),
    },
    trust: {
      policy: structuredClone(f.policy),
      policyId: sdk.rwaPolicyId(f.policy),
      request: structuredClone(f.input.request),
      environment: f.policy.environment,
      keys: [
        { address: account.address, validFrom: 1799996400, validUntil: 1800003600, revoked: false },
      ],
      callProfile: structuredClone(f.callProfile),
    },
  };
}
