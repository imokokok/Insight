# Narrow action prompts

Use these prompts as written or keep the same boundaries.

## Proposed swap or trade

> Before I sign or submit this proposed trade, call Insight's pre-trade safety
> tool with the exact asset, chain, action, notional, and token address. Show me
> the verdict, freshness, source agreement, max deviation, and key reasons.
> If the result is DANGER or BLOCK, do not propose an execution path. If it is
> PASS or CAUTION, tell me that it is risk evidence, not authorization.

## Proposed direct Base Aave V3 action

> I have an unsigned, direct Base Aave V3 supply or variable-rate borrow call.
> Use `base_lending_guard_exact_call` with the exact transaction and my declared
> post-action collateral and debt values. If it is not an attested ALLOW, stop.
> Do not ask for a transaction signature. Explain that I need a separate wallet
> authorization and execution-evidence workflow.

## After a blocking result

> Do not refresh inputs, change calldata, or call another route to evade the
> blocking decision. Explain the blocking reasons and ask whether I want a new,
> separately assessed proposal.
