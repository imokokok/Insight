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
  `MAX_DEVIATION`, `INSUFFICIENT_QUORUM`, `ANOMALY_ELEVATED` (reusing the
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
- **Foundry scaffold** (`foundry-harness/`): the planned real-contract
  execution layer on a mainnet fork; not yet wired into CI.

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
