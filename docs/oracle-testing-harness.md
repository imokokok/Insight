# Oracle Scenario Testing Harness

Deterministic replay of oracle failure scenarios against a detection policy,
with EIP-712 signed test receipts. Ships the "oracle anomaly testing"
capability announced for the pre-trade / Oracle Watch lines: incidents become
replayable scenarios, and every run can produce a verifiable receipt.

## Components

- **DSL** (`src/lib/testing/oracleScenario/schema.ts`): a JSON scenario is a
  sequence of steps (`baseline` / `attack`) with per-provider source state and
  the price the protocol would settle against, evaluated against an explicit
  policy (max staleness, max cross-source deviation, min sources).
- **Engine** (`engine.ts`): fully deterministic. Emits `STALE_DATA`,
  `MAX_DEVIATION`, `INSUFFICIENT_QUORUM`, `INSUFFICIENT_INDEPENDENCE`, `ANOMALY_ELEVATED` (reusing the
  unsupervised detector from `src/lib/anomaly`) and `PRECISION_DRIFT`
  (cumulative sub-threshold drift). Verdicts: `caught` / `partial` / `missed`,
  with baseline false positives reported separately.
- **Fixtures** (`fixtures.ts`): mechanism reconstructions of publicly
  documented incidents (Euler Price Oracles stale data per ChainSecurity's
  audit; the Compound 2020 feed outage; Mango 2022 thin-liquidity pumping;
  Cream 2021 oracle manipulation; Centrifuge ERC-7540 rounding accumulation
  per Recon's case study) plus clearly-labeled synthetic scenarios. Prices are
  reconstructions, never claims about historical market data.
- **Receipts** (`attestation.ts`): `OracleScenarioRun` EIP-712 schema v1 binds
  the verdict to the canonical scenario hash and the reason-code set. Open
  verification via `POST /api/v1/testing/attestations/verify`.
- **Independent verifier** (`verifier/`): `OracleScenarioRun` is registered in
  the standalone package, so a test receipt is verifiable offline with no
  dependency on the Insight API. See "Routing" below for the one thing to know
  about it.
- **Foundry scaffold** (`foundry-harness/`): the planned real-contract
  execution layer on a mainnet fork; not yet wired into CI. Do not treat it as
  a product surface.

## Routing: `OracleScenarioRun` also reads `schemaVersion: 1`

The test receipt shares `schemaVersion: 1` with the v1 pre-trade receipt. The
two are separated ONLY by `primaryType` / `type` (`OracleScenarioRun` vs
`OracleSafetyCheck`). Both the production router
(`src/lib/attestations/verifyAttestationBySchema.ts`) and the offline verifier
(`verifier/src/verify.ts`) therefore branch on `primaryType` BEFORE any numeric
schema-version test. Moving that branch below the version checks would hash
every harness receipt against the 11-field v1 layout and fail UID recovery.

The test line also anchors its start time with `ranAt`, not `checkedAt`; both
verifiers map `ranAt` onto the shared `checkedAt` output field so callers need
no per-schema branch.

## Internal quality tooling (not a product surface)

Two local scripts check the harness against the live path. Both are internal
verification tools: nothing they produce is billed, published, or sent to a
partner.

| Command                            | What it proves                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `npm run oracle:test:replay-check` | Real captured snapshots replayed offline agree with what Watch reported live   |
| `npm run oracle:test:verifier-e2e` | The PACKAGED verifier verifies test receipts, and v1 pre-trade is not diverted |

`replay-check` is a **consistency gate, not attack coverage**. Replaying
observed data can only show that a healthy feed looks healthy; only the
injected-failure fixtures can speak to attack detection, and they say nothing
about a real market. It runs in CI and **skips** when no snapshot file is
supplied, so "skipped" must never be read as "agreed".

One modelling gap remains, documented in
`scripts/oracle-testing/watchReplayPolicy.ts`: the harness's `STALE_DATA` rule
is age-only where the live rule is consensus-aware. Treat a lone `STALE_DATA`
disagreement as a known gap, not automatically a bug. The independence gate is
no longer a gap — the engine models it as production defines it (distinct
non-derived operator groups, threshold 2, absent policy disables the gate).

Snapshot input lives outside the repo at
`~/.workbuddy/insight_oracle_testing/watch-snapshots.json`; point `--path` at a
different file to replay another capture.

## API surface

| Endpoint                                   | Purpose                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `GET /api/v1/testing/scenarios`            | Scenario catalog with provenance                                                |
| `GET /api/v1/testing/runs`                 | Harness metadata + expected detection per kind                                  |
| `POST /api/v1/testing/runs`                | Run a built-in or inline scenario; returns result + optional signed attestation |
| `GET /api/v1/testing/attestations/verify`  | Attester identity + schema descriptor                                           |
| `POST /api/v1/testing/attestations/verify` | Open receipt verification                                                       |

## Guarantees

- Same scenario bytes → same run result; the signed `scenarioHash` names
  exactly the sequence executed.
- Signing is additive: without an attester key, runs still return full
  results (`attestation: null`).
- Field order of the v1 schema is frozen; changes require a schema bump.
