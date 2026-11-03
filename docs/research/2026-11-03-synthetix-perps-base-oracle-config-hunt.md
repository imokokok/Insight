# Oracle config flaw hunt — Synthetix Perps V3 (Base) perp market parameters

Status: research note (passive read-only scan). Not a bug-bounty report; see the
disclosure judgment section. Companion script:
`scripts/oracle-hunt-synthetix-perps-base.mjs`.

## Scope and provenance

Fourth entry in the oracle-config defect-hunting pipeline (after the 2026-10-21
Moonwell Base risk list). Target: the perp market parameters of Synthetix Perps
V3 on Base (andromeda deployment), the venue behind Insight's Base Perp Guard.

- 108 perp markets scanned at block **53456861** (2026-11-03T10:51:09Z).
- Address provenance is first-hand: `@synthetixio/v3-contracts@8.10.0`,
  `8453-andromeda` cannon.json — PerpsV3MarketProxy
  `0x0A2AF931eFFd34b81ebcc57E3d3c9B1E1dE1C9Ce`, PythERC7412Wrapper default
  `0x8250F4aF4B972684F7b336503E2D6dFeDeB1487a`.
- All reads are view calls; zero transactions, zero state changes.
- Four checks per market, mirroring the Moonwell list:
  1. price-source structure — settlement strategy feed id and price-verification
     contract vs `getPriceData`, and whether the feed id actually prices the
     right asset (Pyth on-chain price vs DefiLlama reference);
  2. staleness/timeout config — `strictStalenessTolerance`, settlement delay and
     window, observed Pyth accumulator age;
  3. mark-price sanity — cross-source deviation and confidence-interval width;
  4. market-parameter sanity — open-interest caps, skew/funding bounds, fees,
     liquidation parameters, locked-OI ratio.

## Findings

### F1 — Staleness-tolerance posture is inverted for the deepest markets (config observation)

`getPriceData(...).strictStalenessTolerance` distribution:

| tolerance | markets                        |
| --------- | ------------------------------ |
| 60 s      | 106                            |
| 3600 s    | **BTC (id 200), ETH (id 100)** |

The two highest-volume markets accept on-chain price data up to one hour old in
the ERC-7412 lookup path, while every long-tail market enforces 60 s. Looser
tolerance on the assets with the most open interest is the opposite of the
conservative posture we expected; an agent (or keeper) that trusts the
staleness bound inherits up to an hour of price lag exactly where position
sizes concentrate.

### F2 — No open-interest caps are configured anywhere (config observation)

`maxOpenInterest()` returns 0 and `getMaxMarketSize()` / `getMaxMarketValue()`
return 0 for **all 108 markets** (0 = uncapped in Perps V3 conventions). Size
risk is bounded only by margin and liquidation parameters, not by any market
cap. Agents sizing positions from "max market size" style evidence will read
zero; any tool that treats 0 as "closed market" is wrong, and any tool that
treats 0 as "unlimited" must say so explicitly.

### F3 — Live settlement oracle differs from the deployment snapshot (informational)

All 108 markets settle through Pyth verification contract
`0x9Cb0B428632fc7dC56FDf453aEd890BA55B1953a`, while the published cannon
snapshot (8.10.0) defaults to `0x8250F4aF4B972684F7b336503E2D6dFeDeB1487a`.
Governance has rotated the wrapper since deployment. Consequences:

- Integration docs derived from deployment artifacts are stale; read the
  strategy from chain (`getSettlementStrategy(marketId, 0)`).
- The live wrapper reverts plain `eth_call` price views (ERC-7412
  `OracleDataRequired`); clients must implement update forwarding. `indexPrice`
  reverts the same way. A passive scanner cannot fetch the live perp index
  price at all without the ERC-7412 flow.

### F4 — The legacy default wrapper holds long-stale prices (agent-ops risk)

Prices read from the snapshot default wrapper `0x8250F4aF…`:

| accumulator age | markets |
| --------------- | ------- |
| < 1 h           | 0       |
| 1–48 h          | 17      |
| > 48 h          | 91      |

Worst examples: PEPE shows −45.47% vs the DefiLlama reference from a ~78-day
old accumulator; FARTCOIN +4.87% and XMR −4.40% from ~37 h accumulators. The
magnitudes are explained by staleness, not live misconfiguration — but any
agent pointed at the deployment-default wrapper inherits silently stale
marks. This is the perp-market analogue of the Moonwell staleness finding:
the dangerous number is the one that looks like a price.

### F5 — Wide on-chain confidence interval on TON (informational)

TON (id 2500) on-chain confidence interval was 1.97% of price at scan time
(threshold 1%). Small-cap feeds can carry wide bands; evidence layers should
surface confidence width alongside the price.

### F6 — Uniform, sane parameters elsewhere (negative result)

No defect class from the checklist fired outside the above:

- settlement strategy 0 on all markets: type Pyth, delay 2 s, window 60 s,
  none disabled, commitment delay 0; strategy feed id and `getPriceData` feed
  id differ by design (ERC-7412 node id vs Pyth feed id) — recorded, not flagged;
- feed ids: none zero; majors validated against independent references
  (BTC +0.16%, ETH −0.48%, SOL −0.01% vs DefiLlama);
- fees: taker 0.05% (3 markets) / 0.08% (1) / 0.10% (104), maker ≤ 0.02%;
- liquidation: initial margin ratio 0.005–6.9, maintenance margin scalar
  0.26–0.723, liquidation window 30 s, no zeroed liquidation limits;
- funding: `skewScale` nonzero on all 108; max funding velocity 4–36; observed
  funding rates extreme only on illiquid listings (RUNE 1.52, YFI 0.51,
  TRUMP −0.43);
- locked-OI ratio 10% on all markets; no market with \|skew\| > size.

## Disclosure judgment

No finding describes an attack path to protocol fund loss: F1/F2 are
governance parameter choices, F3/F4 are integration footguns rather than
protocol bugs, F5/F6 are informational. Consistent with the Moonwell
precedent, this is published as a research note rather than a bounty report.
If a future scan finds a tolerance/cap combination that enables profit at
protocol expense, that escalates to the Immunefi pipeline.

## Implications for Insight

1. **Base Perp Guard**: the guard already fails closed when price evidence is
   unavailable; F3 confirms this is not optional on Synthetix Base — plain
   read-only price views revert. The guard's evidence layer must not fall back
   to the snapshot-default wrapper (F4 shows it serves 78-day-old prices).
2. **Evidence fields to expose**: `strictStalenessTolerance` per market (F1),
   explicit "no OI cap configured" (F2), confidence width (F5). These are
   cheap reads and directly decision-relevant.
3. **Pipeline**: the scan is repeatable (`scripts/oracle-hunt-synthetix-perps-base.mjs`,
   raw JSON at `/tmp/oracle-hunt-synthetix-perps-base.json`); re-run
   opportunistically after known governance epochs (wrapper rotation changed
   every market's settlement config since the May 2025 snapshot).

## Limitations

- One snapshot in time; funding rates and confidence widths move.
- Price references come from DefiLlama/Coingecko via HTTP; small-cap assets
  without a mapping are skipped (`dev=n/a`).
- The live settlement wrapper is an ERC-7412 forwarder; this scan does not
  resolve live off-chain prices, so mark-vs-reference checks use the Pyth
  accumulator on the legacy wrapper (magnitude validation for feed ids, not a
  live mark audit).
- `size`/open-interest magnitudes are reported as raw contract values; units
  were not independently verified against an external OI source.
- Hyperliquid perp parameters (off-chain) are out of scope for this pass and
  remain the natural v2 of this hunt.

## Reproduce

```bash
node --env-file=.env.local scripts/oracle-hunt-synthetix-perps-base.mjs
# stdout table + /tmp/oracle-hunt-synthetix-perps-base.json
```
