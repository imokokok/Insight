# Decision-input evidence on BNB Smart Chain: a reproducible evidence sample

**Date:** 2026-11-15 · **Status:** published, pinned by annotated tag `evidence-bnb-sample-2026-11-15` · **Scope:** Insight / PriorSeal projects (oracleinsight.xyz, priorseal.xyz)
**Canonical URL:** `https://github.com/imokokok/Insight/blob/evidence-bnb-sample-2026-11-15/docs/evidence/bnb-decision-input-sample-2026-11-15/README.md`
**Companion files:** `bnb-observation-vector-2026-11-15.json`, `verify-bnb-observations.mjs`
**License:** MIT, matching both public repositories.

---

## 0. What this is, and is not

This is a **format sample built from real BNB Smart Chain (chain 56) mainnet oracle reads**. It shows what an independently recomputable record of "what a decision saw" looks like: every input's identity, value, timestamp, freshness, whether it was used, and — critically — why it was excluded, all bound into one hash that a third party can recompute without trusting us.

We do **not** claim:

- that this is a production Insight guard decision. There is **no EIP-712 signature, no PriorSeal checkpoint, no on-chain anchor and no transaction** in this sample.
- any judgement about whether any Aster market price was right or wrong. We do not sell conclusions.
- that any Chainlink feed is unhealthy. `stale` below is a freshness threshold **declared by this sample**, not a feed failure.
- that either project accepts x402 payment **on BNB** today. Measured production 402 responses advertise no `eip155:56` for either project (Insight pre-trade measured 2026-11-15; PriorSeal `/v1/integration-readiness` measured 2026-11-16, see §8). `bnbconfig.json` describes the intended AEON mandate-flow rail; this sample assumes nothing beyond it.
- any conformance claim for ERC-8004's Validation Registry. Insight's code forbids advertising Validation support until canonical deployments exist, and no confirmed mainnet deployment of that registry has been verified.
- that we cover Aster mark-price construction. Aster's internal mark/fair price is not read on-chain via the feeds below; this sample cannot and does not perform an Aster pre-trade guard.
- conformance with AAT, SCITT, RFC 8785, RFC 6962 or RFC 3161, or any regulatory compliance.
- any modification to the signed `oracle-incident-corpus` v1.0.0.

---

## 1. Why this sample exists

BNB Chain's own 2026 AI-agent landscape names four things an agent economy needs: identity, capability, payment, and **accountability** — "a verifiable trail of what an agent did, so other parties can trust or dispute it". The first three are populated by named ecosystem players; accountability is the layer the official write-up fills thinnest.

Two publicly reported BNB-ecosystem events illustrate the evidentiary gap this sample addresses:

| Date       | Venue / surface       | Reported event                                                                                                     | Secondary source |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------- |
| 2026-10-12 | Aster DEX (APM/USDT)  | Internal mark price printed from <$0.01 to $45 (~4,400×) with **zero movement on any other venue**; accounts were liquidated even at 5× margin | CoinsProbe (unverified — see §9) |
| 2026-09/10 | BNB Chain hackathon brief | The official Tokenized Stocks brief opens with: markets close Friday, on-chain trading continues, "priced off a reference that has not updated in two days… almost nobody has built anything that acts on it" | bnbchain.org (official) |

The common structure across both is **not** "the price was wrong". It is that _the input set a decision relied on, its freshness, and its exclusion rules were not independently reconstructable afterwards_. The Aster dispute cannot currently be argued from recomputable facts; the tokenized-stocks weekend gap is visible to everyone and acted on by almost no one.

This sample exists to make that second claim concrete on BNB specifically: an **input closure that remains recomputable at audit or dispute time**, including the observations that were discarded.

---

## 2. Measured inputs (all fetched, none inferred)

| Field           | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| RPC             | `https://bsc-dataseed.bnbchain.org`                            |
| chainId         | 56 (BNB Smart Chain mainnet)                                   |
| block number    | 133,765,751                                                    |
| block timestamp | 1,794,759,256 → 2026-11-15T16:14:16Z                           |
| method          | `eth_call` `latestRoundData()` (`0xfeaf968c`) and `decimals()` (`0x313ce567`), pinned to that block |

| Symbol | Feed (last 8) | dec |               raw answer |          value |  updatedAt |       age |
| ------ | ------------- | --: | -----------------------: | -------------: | ---------: | --------: |
| BTC    | `3aCa5Ebf`    |   8 |        6,452,756,248,575 | 64,527.56248575 | 1794759227 |      29 s |
| ETH    | `401d5b2e`    |   8 |          180,612,000,000 |    1,806.120000 | 1794759247 |       9 s |
| BNB    | `7D42aeE`     |   8 |           58,943,964,000 |    589.43964000 | 1794759237 |      19 s |
| USDT   | `88b4320`     |   8 |               99,939,000 |      0.99939000 | 1794758835 |     421 s |
| USDC   | `69EA163`     |   8 |               99,980,000 |      0.99980000 | 1794759200 |      56 s |
| TSLA   | `c9B57893`    |   8 |           38,947,000,000 |    389.47000000 | 1794689955 |  69,301 s |
| AAPL   | `e0fae0B6`    |   8 |           35,574,500,000 |    355.74500000 | 1794688169 |  71,087 s |
| U      | `7D2a0c72f`   |  18 |  999,300,150,000,000,000 |      0.99930015 | 1794691430 |  67,826 s |

Full addresses are in the JSON vector. Feed addresses come from the Insight production feed catalog (`oracle_feeds`, `chain_id=56`, `source=chainlink-rdd` — ingested from Chainlink's public feed directory). Every address was independently verified on-chain at the pinned block by the reads above (fresh round data and the expected `decimals()`).

The TSLA and AAPL last-update timestamps land on **Saturday, 14 November (~20:36 / ~21:01 UTC)**. By capture time (Sunday 16:14 UTC) both tokenized-equity feeds were ~19 hours old. We record the fact and let a reviewer interpret it; the sample makes no claim about why the underlying reference paused, only that a decision consuming these feeds at that moment would have seen — and could have recorded — exactly this staleness.

---

## 3. Policy declared by this sample

| Rule                   | Value           |
| ---------------------- | --------------- |
| Freshness threshold    | 14,400 s (4 h)  |
| Required feed decimals | 8               |
| Value scale            | ×1e8, `uint256` |

These thresholds are **declared by this sample** so a verifier can reproduce the inclusion decisions. They are not production guard configuration. The two tokenized-equity feeds and the 18-decimal feed are excluded by these declared rules — recorded, reviewable policy decisions, not feed-failure claims.

The `U / USD` feed is 18-decimal, which the catalog explicitly notes must never be hardcoded to 8. It is excluded as `unsupported` — separate decoder required. Its **normalized** value (0.99930015 ×1e8) is still carried in the record; the raw 1e18-scale answer is shown in §2 for clarity.

---

## 4. The observation vector

Eight feeds were read. Five were included, three excluded:

| Feed                  | included | exclusionReason | why                                       |
| --------------------- | -------- | --------------- | ----------------------------------------- |
| BTC, ETH, BNB, USDT, USDC | true | `''`            | within 4 h, 8-decimal                     |
| TSLA, AAPL            | false    | `stale`         | age 69,301 s / 71,087 s > 14,400 s        |
| U                     | false    | `unsupported`   | 18 decimals, requires a separate decoder  |

**Excluded observations remain in the hash.** A record that omits discarded inputs cannot be audited: a reviewer cannot tell whether a divergent source was never seen, or was seen and silently dropped.

The snapshot spans heterogeneous assets (crypto, stablecoin, tokenized-equity, exchange-rate), which is normal for a portfolio decision that prices collateral and debt together. `crossProviderAgreement` is defined only for multiple providers quoting the _same_ asset, so it is deliberately **not reported** rather than shown as a misleading number.

---

## 5. Result

Canonicalization: `insight-provider-observations-hash/v1` — ABI-encode each 7-field entry → `keccak256` each → sort the 32-byte hashes lexicographically → concatenate → `keccak256` once. Sorting makes the root order-independent.

```
providerObservationsHash
0x71bb3ffa56d3253d3d6f318ef25f13174129f08c8502ae4c90af221ac7bb63d3
```

Computed from the JSON vector alone using only `viem` primitives, and **independently recomputed** by the companion verifier: result `MATCH`, exit code 0.

---

## 6. How to reproduce

Requirements: Node 18+ and `viem`, resolved from the **current working directory** (the script uses `createRequire` anchored to `process.cwd()`). No Insight server, no API key, no payment, no network access at verification time.

```bash
# from the insight repo root (which already has viem installed):
cd /path/to/insight && node \
  docs/evidence/bnb-decision-input-sample-2026-11-15/verify-bnb-observations.mjs

# or, from any scratch directory with viem installed:
npm i viem && node /path/to/verify-bnb-observations.mjs
```

The script resolves the JSON vector relative to **its own directory**, so keep the three files together. Verified 2026-11-15 from the insight repo root: output `RESULT MATCH`, exit code 0.

A third party can also replay the underlying reads against any BSC RPC at block 133,765,751 to confirm the eight raw answers, decimals and timestamps. Note the dependency honesty: `viem` is the single third-party dependency here (keccak256 and Solidity ABI encoding are not in Node's built-in `crypto`).

---

## 7. What a third party can take from this

- A concrete, machine-checkable answer to "what did the decision see" on BNB chain 56: feed identity includes chain and contract address; every value carries its own observation timestamp and age; exclusions carry a reason code.
- A pattern that generalises beyond the crypto feeds. The same closure shape applies to any BNB-ecosystem venue where an input set is assembled before an action — including a perp venue assembling its internal mark price from an order book, and a tokenized-stock product consuming an equity reference that pauses over a weekend. Had such a set been published with freshness metadata and exclusion reasons, an Aster-style dispute could be argued from recomputable facts rather than from post-hoc narrative.
- A citable worked example for the `decision-input evidence` line of work, alongside the HyperEVM sample of the same date, the signed incident corpus, and the AAT/SCITT mapping note.

---

## 8. Boundaries, restated

Without a signature and an external anchor, this sample **cannot prove that this observation set existed at the stated time** — it proves only that the encoding is deterministic and independently recomputable from the published vector.

Production status relevant to any BNB reading of this sample, all measured/verified 2026-11-15:

- Insight's production 402 for `/api/v1/safety/pre-trade`, measured 2026-11-15T16:2xZ, advertised `eip155:8453`, `eip155:999`, `solana:…`, and `hyperliquid:mainnet` (the last one is **not** a valid CAIP-2 identifier). It did **not** advertise `eip155:56`, despite `bnbconfig.json` describing the BNB AEON mandate-flow rail. The non-CAIP-2 `accepts[]` entry was subsequently fixed by Insight PR #603 (merged to main 2026-11-16, with a regression test; production deployment was not yet observable at measurement time). The absence of `eip155:56` from `accepts[]` remains the measured state.
- PriorSeal's production 402 for `/v1/integration-readiness`, measured 2026-11-16T00:33Z, advertised the same four networks (`eip155:8453`, `eip155:999`, `solana:…`, `hyperliquid:mainnet`) and no `eip155:56` — despite `docs/architecture/chain-capabilities.md` calling `eip155:56` a validated production pairing through the AEON facilitator. PriorSeal has no equivalent of Insight PR #603 yet. Treat BNB payment availability as **unavailable in production advertising** for both projects as of these measurements.
- Insight does not operate registry contracts, and does not advertise ERC-8004 Validation Registry support (no canonical deployment has been confirmed; the project's own code forbids the claim).
- Nothing here changes the paid API, adds a chain, adds a protocol, or constitutes outreach. It is a format demonstration.

---

## 9. Sources (separated by provenance)

**Fetched in this session (primary):** BSC JSON-RPC `eth_chainId`, `eth_blockNumber`, `eth_getBlockByNumber`, `eth_call` at block 133,765,751; the Insight production feed catalog (`oracle_feeds`, `chain_id=56`, `source=chainlink-rdd`); Insight's production 402 response for `/api/v1/safety/pre-trade` (measured 2026-11-15); PriorSeal's production 402 response for `/v1/integration-readiness` (measured 2026-11-16).

**Project records (primary, internal):** `insight/bnbconfig.json`; `insight/docs/erc8004-reputation-evidence.md`; `insight/docs/research/2026-11-03-discovery-surface-audit-research.md` (validation-registry claim restriction); PriorSeal `docs/architecture/chain-capabilities.md` and `docs/runbooks/x402-production-go-no-go.md`.

**Public reporting (secondary, not individually verified — verify before external citation):** the Aster APM/USDT 2026-10-12 mark-price spike, its magnitude, and the liquidation figures (CoinsProbe reporting of AsterDEX Telegram accounts). The BNB Chain AI-agent landscape and Tokenized Stocks brief are official first-party sources.

---

## 10. Where this goes (and where it does not)

**Publish, do not submit.** The artefact's value is _being citable and independently replayable_. Canonical location: the public `imokokok/Insight` repository, `docs/evidence/bnb-decision-input-sample-2026-11-15/`, pinned by the annotated tag `evidence-bnb-sample-2026-11-15` — same pattern as the HyperEVM sample.

**Do not route it through the service-distribution funnel.** The project's distribution runbook keeps that funnel narrow, records already-open directory PRs, forbids duplicate PRs and second pings. Do not post this to agent402.tools, CDP Bazaar, the awesome lists, or BNB community channels as outreach.

**BNB's official written entry points are a possible — not committed — next step.** MVB (rolling admission, focus includes Middleware: Security/Risk Control Services, prior art includes BAS and an oracle project) and the Kickstart programme (including listing as a service provider) are form-based and asynchronous. Any application must reuse this sample honestly, including the §0 non-claims and the §8 payment-availability discrepancy. No application has been submitted.

**Timing note:** BNB Bangkok (25–27 November 2026) Startup Track requires an in-person pitch and prioritises projects with demonstrated traction; this project's evidence line targets audit/dispute-time value and is a poor fit for that format. This note does not change that assessment.
