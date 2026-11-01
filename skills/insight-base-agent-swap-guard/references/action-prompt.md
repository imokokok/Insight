# Narrow action prompt

> I want to swap through a reviewed direct Base pool. Before showing a wallet
> request, call `prepare_base_agent_swap_guard` with the exact amount,
> recipient, short deadline, the USD price assumptions I used for both assets,
> and explicit limits for slippage, price impact, TWAP divergence, reference
> deviation, and quote age. If it returns CAUTION or BLOCK, do not request a
> signature or switch routes. If it returns ALLOW, show me the exact approval
> and swap calls, their minimum output and deadline, and explain that I must
> separately authorize the byte-identical calls. Treat my two USD inputs as
> decision evidence, not trusted market prices: Insight must validate them and
> use independent destination consensus when valuing the route quote.
