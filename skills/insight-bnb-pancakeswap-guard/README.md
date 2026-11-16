# Insight BNB PancakeSwap V3 Guard

This Skill is the BNB-specific discovery layer for Insight's existing reviewed
PancakeSwap V3 guard. It is intentionally narrower than a general DEX router:
the protected call shape is one reviewed pool, one direct router call, and one
exact-input swap.

Use it with PriorSeal for the authorization and receipt layer:

```text
Insight ALLOW + signed decision
→ PriorSeal exact-call approval authorization
→ approval observation
→ PriorSeal exact-call swap authorization
→ swap observation and evidence receipt
```

The companion example is in the PriorSeal repository:
[bnb-pancakeswap-priorseal-v1](https://github.com/imokokok/PriorSeal/tree/main/examples/bnb-pancakeswap-priorseal-v1).
