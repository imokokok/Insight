# Transaction-specific swap risk review

`InsightGuard.assessV3Swap()` combines the existing two-sided signed pre-trade
oracle assessment with a concrete EVM call review. The adapter is limited to
the original Uniswap V3 SwapRouter `exactInputSingle` with a deadline inside
the tuple, one ERC-20 pool hop, zero native value and no partial-fill price
limit. Other routers need separately reviewed adapters.

The caller prepares the exact transaction and supplies a viem `PublicClient`
(or equivalent `SwapRiskReader`) and an **independently reviewed** router runtime
code hash. The adapter decodes calldata, checks token addresses against the two
oracle legs, reads router code and token decimals at one block, and simulates
the exact call from the intended sender at that block. The simulated output is
the block-specific route quote. It converts the actual input amount to USD with
the signed source reference price and token decimals, then checks it against
the amount in both signed pre-trade proofs. It also checks quote deviation from
the cross-oracle reference, minimum output, allowed slippage, block age, and
swap and oracle evidence expiry.

- `ACCEPTABLE`: this exact call met the configured policy at the observed block.
- `RISK_REJECTED`: usable evidence shows a policy or minimum-output failure.
- `UNASSESSABLE`: a required oracle leg, route, code identity, RPC read,
  simulation or freshness fact is missing. This is never approval.

`authorizeAssessedV3Swap()` runs the review immediately before PriorSeal
authorization, refuses any outcome other than `ACCEPTABLE`, rechecks freshness
during prepare and signing, and binds the unsigned review record as an additional
PriorSeal context commitment. It does not sign or broadcast the transaction.
The exact calldata and account nonce remain bound by the ordinary PriorSeal
intent. The separate PriorSeal swap adapter must still validate token, amount,
recipient, router, fee, deadline and router code at signing/submission.

The transaction review is local SDK policy output, **not** a new signed Insight
attestation. Signed Insight C3 proofs cover oracle state. A pinned RPC simulation
describes one block and cannot guarantee a future fill, gas cost, MEV outcome,
token behavior or finality. The router code hash must come from a trusted
deployment configuration, not the transaction proposer. For upgradeable proxies,
pinning proxy runtime alone does not pin the implementation. Approval, allowance,
balance and gas readiness are prerequisites for realistic simulation; an RPC
failure stays `UNASSESSABLE`. Any changed calldata or expired evidence requires
fresh review.

## Example

```ts
import { InsightGuard } from 'oracle-insight-guard';

const guard = new InsightGuard({ apiKey: process.env.INSIGHT_API_KEY! });
const { transactionRisk } = await guard.assessV3Swap({
  source: {
    asset: 'WETH',
    destinationAsset: 'USDC',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 1000,
  },
  destination: {
    asset: 'USDC',
    destinationAsset: 'WETH',
    chainId: 1,
    action: 'swap',
    tradeAmountUsd: 1000,
  },
  receipt: { settlementChainId: 1 },
  transaction: preparedExactCall,
  routerCodeHash: reviewedRouterCodeHash,
  reader: publicClient,
});

if (transactionRisk.status !== 'ACCEPTABLE') {
  throw new Error(transactionRisk.reasonCodes.join(', '));
}

// For authorization, use authorizeAssessedV3Swap with the same fields and
// PriorSealFlowOptions. It performs a fresh assessment itself.
```

Policy defaults are 100 bps maximum quote deviation from the oracle reference,
100 bps maximum difference between actual and assessed USD amount, the
assessment's maximum slippage (normally 50 bps), and a 30-second maximum block
age. Display all limits and the exact token atomic amounts to the signer.
