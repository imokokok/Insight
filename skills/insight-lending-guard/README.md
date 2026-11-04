# Insight Lending Guard — Base Aave V3 direct calls

This focused Skill is intentionally narrower than a general “DeFi safety” tool.
It evaluates one exact, unsigned Base mainnet direct Aave V3 `supply` or
variable-rate `borrow` call before any wallet signature.

Install the remote endpoint with [`mcp.json`](mcp.json), then use the
no-money discovery check from the companion
[`insight-pre-trade-safety` Skill](../insight-pre-trade-safety/examples/connection-check.mts).

The required tool is `base_lending_guard_exact_call`. Its signed five-minute
decision commits to the direct transaction's chain, sender, target, calldata
hash, nonce, zero value, verdict, and risk inputs. The exact supported profile
and REST form are in [Base Lending Guard](../../docs/base-lending-guard.md).

An Insight `ALLOW` is not a signature request and cannot move funds. To turn an
attested `ALLOW` into a bounded, user-authorized action with later evidence,
use [PriorSeal's Guarded Action integration](https://github.com/imokokok/PriorSeal/blob/main/docs/integrations/guarded-action.md).
