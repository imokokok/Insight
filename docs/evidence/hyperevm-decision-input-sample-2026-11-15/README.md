# Decision-input evidence on HyperEVM: a reproducible evidence sample

**Date:** 2026-11-15 · **Status:** published, pinned by annotated tag `evidence-hyperevm-sample-2026-11-15` · **Scope:** Insight / PriorSeal projects (oracleinsight.xyz, priorseal.xyz)
**Canonical URL:** `https://github.com/imokokok/Insight/blob/evidence-hyperevm-sample-2026-11-15/docs/evidence/hyperevm-decision-input-sample-2026-11-15/README.md`
**Companion files:** `hyperevm-observation-vector-2026-11-15.json`, `verify-hyperevm-observations.mjs`
**License:** MIT, matching both public repositories. Section 10 records where this goes and where it does not.

---

## 0. What this is, and is not

This is a **format sample built from real HyperEVM mainnet oracle reads**. It shows what an independently recomputable record of "what a decision saw" looks like: every input's identity, value, timestamp, freshness, whether it was used, and — critically — why it was excluded, all bound into one hash that a third party can recompute without trusting us.

We do **not** claim:

- that this is a production Insight guard decision. There is **no EIP-712 signature, no PriorSeal checkpoint, no on-chain anchor and no transaction** in this sample.
- any judgement about whether any HIP-3 market price was right or wrong. We do not sell conclusions.
- that any Chainlink feed is unhealthy. `stale` below is a freshness threshold **declared by this sample**, not a feed failure; the catalogued heartbeat for these feeds is 86,400 s.
- conformance with AAT, SCITT, RFC 8785, RFC 6962 or RFC 3161, or any regulatory compliance.
- any modification to the signed `oracle-incident-corpus` v1.0.0. Adding incidents requires re-signing, and that has **not** been done.
- that we cover HIP-3 pricing. HIP-3 deployer quotes are not on-chain; the Chainlink feeds below are HyperEVM (chain 999) feeds. This sample cannot and does not perform a HIP-3 pre-trade guard.

---

## 1. Why this sample exists

HIP-3 lets a builder stake 500,000 HYPE and define its own markets, including the oracle each market uses. That is a design choice, not a defect — but it produces a specific evidentiary gap. Four publicly reported incidents in the first year illustrate it:

| Date         | Market        | Reported event                                                                             | Reported liquidations       |
| ------------ | ------------- | ------------------------------------------------------------------------------------------ | --------------------------- |
| mid-Dec 2025 | XYZ100        | $10M Sunday short moved price ~3.5% while Nasdaq futures were closed                       | ~$13M                       |
| 2026-01-29   | Gold / silver | Silver fell ~12% in a day                                                                  | ~$71M across 3,200 users    |
| 2026-04-07   | WTI / Brent   | Oil dropped after a ceasefire announcement                                                 | ~$79.7M                     |
| 2026-07-27   | SK Hynix      | One bad pre-market print cut the mark price 18.7%; profitable shorts were auto-deleveraged | $57–80M across 960 accounts |

Galaxy Research reportedly found that in the SK Hynix event **every oracle input read the same Korean order book**, so median and averaging rules absorbed only part of the move. The common structure across these events is not "the price was wrong" — it is that _the input set, its independence, and the exclusion rules were not independently reconstructable afterwards_.

What an established real-time compliance vendor sells on Hyperliquid is the complementary layer: _"We screened this in real time and can show our thresholds"_ (Blockaid, 2026-08-04). That value is realised **before** a trade clears and is driven by AML/KYC/sanctions obligations. Our layer is different and deliberately so: an **input closure that remains recomputable at audit or dispute time**, including the observations that were discarded.

This sample exists to make that second claim concrete and citable. It is the worked example the 2026-11-15 public-goods pre-submission note currently lacks.

---

## 2. Measured inputs (all fetched, none inferred)

| Field           | Value                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------- |
| RPC             | `https://rpc.hyperliquid.xyz/evm`                                                                   |
| chainId         | 999 (HyperEVM mainnet)                                                                              |
| block number    | 51,341,641                                                                                          |
| block timestamp | 1,794,756,931 → 2026-11-15T15:35:31Z                                                                |
| method          | `eth_call` `latestRoundData()` (`0xfeaf968c`) and `decimals()` (`0x313ce567`), pinned to that block |

| Symbol | Feed (last 8) | dec |                 raw answer |           value |  updatedAt |      age |
| ------ | ------------- | --: | -------------------------: | --------------: | ---------: | -------: |
| BTC    | `c6E97A82`    |   8 |          6,475,449,940,747 | 64,754.49940747 | 1794753082 |  3,849 s |
| ETH    | `c0Fa55B0`    |   8 |            180,846,224,833 |  1,808.46224833 | 1794754256 |  2,675 s |
| HYPE   | `559ed352`    |   8 |              6,729,779,800 |     67.29779800 | 1794756047 |    884 s |
| SOL    | `C464224D`    |   8 |              7,136,398,300 |     71.36398300 | 1794753974 |  2,957 s |
| USDC   | `0620223B`    |   8 |                 99,976,500 |      0.99976500 | 1794675401 | 81,530 s |
| USDT   | `6181Ed07`    |   8 |                 99,924,099 |      0.99924099 | 1794675283 | 81,648 s |
| KHYPE  | `773D9bcc`    |  18 | 69,134,414,624,850,740,000 |     69.13441462 | 1794756373 |    558 s |

Full addresses are in the JSON vector. Feed addresses come from Insight migration `0131_hyperevm_chainlink_feeds.sql`, sourced from Chainlink's public Hyperliquid mainnet feed directory (verified 2026-11-08).

---

## 3. Policy declared by this sample

| Rule                   | Value           |
| ---------------------- | --------------- |
| Freshness threshold    | 14,400 s (4 h)  |
| Required feed decimals | 8               |
| Value scale            | ×1e8, `uint256` |

These thresholds are **declared by this sample** so a verifier can reproduce the inclusion decisions. They are not production guard configuration. In particular, the two stablecoin feeds at ~22.6 h are well inside their 86,400 s catalogued heartbeat; excluding them here demonstrates a _recorded, reviewable policy decision_, not a claim that the feeds failed.

The KHYPE/USD feed is 18-decimal, which the migration explicitly notes must never be hardcoded to 8. It is excluded as `unsupported` — separate decoder required. Its scaled value is still carried in the record.

---

## 4. The observation vector

Seven feeds were read. Four were included, three excluded:

| Feed                | included | exclusionReason | why                                      |
| ------------------- | -------- | --------------- | ---------------------------------------- |
| BTC, ETH, HYPE, SOL | true     | `''`            | within 4 h, 8-decimal                    |
| USDC, USDT          | false    | `stale`         | age 81,530 s / 81,648 s > 14,400 s       |
| KHYPE               | false    | `unsupported`   | 18 decimals, requires a separate decoder |

**Excluded observations remain in the hash.** A record that omits discarded inputs cannot be audited: a reviewer cannot tell whether a divergent source was never seen, or was seen and silently dropped. That distinction is exactly what the SK Hynix post-mortem turned on.

The snapshot spans heterogeneous assets (collateral-side and stablecoin-side reads), which is normal for a lending decision that checks collateral and debt prices together. `crossProviderAgreement` is defined only for multiple providers quoting the _same_ asset, so it is deliberately **not reported** here rather than shown as a misleading number.

---

## 5. Result

Canonicalization: `insight-provider-observations-hash/v1` — ABI-encode each 7-field entry → `keccak256` each → sort the 32-byte hashes lexicographically → concatenate → `keccak256` once. Sorting makes the root order-independent.

```
providerObservationsHash
0xdf59bac2948a1464b284946ff4948a8b53578c40f97eddcdddd5db384be33d08
```

Computed with the published implementation (`insight/src/lib/attestations/providerObservationsHash.ts`) and then **independently recomputed** using only `viem` primitives from the JSON vector alone. Both produced the identical value; result `MATCH`.

---

## 6. How to reproduce

Requirements: Node 18+ and `viem`, resolved from the **current working directory** (ESM resolves bare imports from the importing file's location, so the script uses `createRequire` anchored to `process.cwd()`). No Insight server, no API key, no payment, no network access at verification time.

```bash
# from the insight repo root (which already has viem installed):
cd /path/to/insight && node \
  docs/evidence/hyperevm-decision-input-sample-2026-11-15/verify-hyperevm-observations.mjs

# or, from any scratch directory with viem installed:
npm i viem && node /path/to/verify-hyperevm-observations.mjs
```

The script resolves the JSON vector relative to **its own directory**, so keep the three files together; `viem` resolves relative to the **current working directory**, so run from a directory where it is installed. Verified on 2026-11-15 from the insight repo root: output `RESULT MATCH`, exit code 0.

The script reads the JSON vector, re-encodes every observation with the published ABI, sorts and hashes, compares against `providerObservationsHash`, and exits non-zero on mismatch. A third party can also replay the underlying reads against any HyperEVM RPC at block 51,341,641 to confirm the seven raw answers and timestamps.

Note the dependency honesty: the PriorSeal verification-bundle path is zero-dependency (`node:crypto` only), but this hash uses keccak256 and Solidity ABI encoding, which Node's built-in `crypto` does not provide. `viem` is the single third-party dependency here.

---

## 7. What a third party can take from this

- A concrete, machine-checkable answer to "what did the decision see": feed identity includes chain and contract address; every value carries its own observation timestamp and age; exclusions carry a reason code.
- A pattern that generalises beyond HyperEVM. The same closure shape applies to any venue where an input set is assembled before an action — including a HIP-3 deployer assembling reference quotes from multiple venues. Had that set been published with independence metadata and exclusion reasons, the SK Hynix dispute could have been argued from recomputable facts rather than from post-hoc narrative.
- A citable worked example for the `decision-input evidence` public-goods submission dated 2026-11-15, alongside the signed incident corpus, the AAT/SCITT mapping note and the canonicalization profile.

---

## 8. Boundaries, restated

Without a signature and an external anchor, this sample **cannot prove that this observation set existed at the stated time** — it proves only that the encoding is deterministic and independently recomputable from the published vector. The production path closes that gap with an EIP-712 `HyperEvmLendingGuardDecision` attestation, a PriorSeal signed checkpoint, and an `eip155` anchor transaction with independent RPC re-verification (including rejection of anchors later than execution). Those components exist in the two repositories; **none of them were run for this sample**.

Nothing here changes the paid API, adds a chain, adds a protocol, or constitutes outreach. It is a format demonstration.

---

## 9. Sources (separated by provenance)

**Fetched in this session (primary):** HyperEVM JSON-RPC `eth_blockNumber`, `eth_getBlockByNumber`, `eth_chainId`, `eth_call` at block 51,341,641; Hyperliquid `info` endpoint `perpDexs` and `metaAndAssetCtxs` on 2026-11-15; DefiLlama `/v2/chains`; the production `GET /api/v1/safety/hyperevm-lending-guard` 402 response; Insight migration `0131_hyperevm_chainlink_feeds.sql` and `docs/hyperevm-lending-guard.md`.

**Public reporting (secondary, not individually verified — verify before external citation):** the four HIP-3 incident dates and liquidation figures; Galaxy Research's SK Hynix oracle-input finding; Blockaid's 2026-08-04 blog post; Chainlink's Hyperliquid feed directory. One discrepancy is unresolved: a July 2026 report puts HIP-3 above 50% of total Hyperliquid volume, while the 2026-11-15 `metaAndAssetCtxs` measurement puts the ten builder dexes at 8.3% of combined notional. The two figures use different periods or scopes and must not be added or substituted.

---

## 10. Where this goes (and where it does not)

**Publish, do not submit.** This artefact's value is _being citable and independently replayable_. A message sinks; a stable, version-pinned URL does not. So the first action is publication, not outreach. Publication is complete as of 2026-11-15; every outreach condition below remains unmet, and nothing has been sent.

**Canonical location (published):** the public `imokokok/Insight` repository, directory `docs/evidence/hyperevm-decision-input-sample-2026-11-15/`, holding this note as `README.md`, the JSON vector and the verifier. The three files landed together in one squashed commit on `main` and are pinned by the annotated tag `evidence-hyperevm-sample-2026-11-15`; cite the tag URL in the header, not a moving branch path. Insight already publishes comparable technical notes (`docs/evidence-pack.md`, `docs/decision-input-assessment.md`, `docs/hyperevm-lending-guard.md`). **Do not put it in `oracle-incident-corpus`**: that corpus is signed at v1.0.0 and any change requires re-signing; adding these incidents there would break existing citations.

**Do not route it through the service-distribution funnel.** The project's own `docs/distribution/README.md` keeps that funnel deliberately narrow (`install → free discovery → one decision call → bounded action handoff → evidence review`), records seven already-open directory PRs, forbids duplicate PRs and second pings, and forbids an agent from accepting terms or signing on the account holder's behalf. Those surfaces index _callable services_, not evidence notes. Do not post this to agent402.tools, CDP Bazaar, the awesome lists, or the Hyperliquid ecosystem channels; the latter has no buyer for it and would repeat the unanswered outreach of 2026-10-13.

**Do not re-pitch it to a second funder.** The 2026-11-15 fit inquiry sent to `grants@solana.org` states plainly that the same pitch will not be resubmitted to a second list. This sample is not a grant application. If that inquiry draws a reply, the pinned URL can be offered as supporting material; otherwise it stands on its own.

**The one real conversation window — and its timing.** IETF 127 is in session in San Francisco (14–20 November 2026). The AUDIT (Agent Use of Delegation and Interaction Traceability) working-group-forming BoF is **Tuesday 17 November, 09:00–10:30 PST / 17:00–18:30 UTC**. Its draft charter deliberately scopes initial work to **post-hoc auditing** (`audit-bof-preparation` PR #65, "Focus scope on post-hoc analysis"), which is exactly the layer this sample addresses.

But the BoF chairs stated on 8 November that _"The BoF is not the place to present solution drafts or record formats"_ and _"Please don't ask for adoption or argue over solution details until there is a charter"_. On 13 November a participant was told on-list to _"stop referencing to your own drafts as reply to all kind of emails"_ for disrupting the charter discussion. **Therefore: send nothing to `audit@ietf.org` before the BoF, and nothing that presents this as a solution to be adopted.**

After 17 November, charter discussion continues on the mailing list, and the chairs explicitly note that _"anything that matters ... is settled on the mailing list"_, not in the room. When the list asks which existing work already covers part of the problem, the appropriate contribution is **one plain-text message** containing: a concrete use case, the pinned sample URL, and the non-claims from §0 — with no adoption request and no conformance claim. This is a written channel, so spoken-English fluency is not a constraint here.

Sources for this section (fetched 2026-11-15): IETF mail archive threads `[Audit] What to expect from the IETF 127 BoF`, `[Audit] How to engage at IETF 127`, `[Audit] Re: Charter updates for IETF-127 BoF` (12 and 13 November 2026), the IETF 127 agenda, and the AAT -09 datatracker page. AUDIT has no charter yet and the BoF outcome is undetermined; this is a watch item, not a scheduled submission.
