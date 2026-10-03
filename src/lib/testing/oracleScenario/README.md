# Oracle Scenario Testing Harness

Deterministic, policy-relative replay engine for oracle failure scenarios, with
EIP-712 signed test receipts. This is the Phase-0 core of the "oracle anomaly
testing" capability: the same scenario bytes drive the TypeScript engine today
and the Foundry harness (`foundry-harness/` at the repo root) for real-contract
execution.

## Modules

| File             | Role                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `schema.ts`      | Scenario DSL (zod): kinds, steps, sources, policy, canonical JSON                         |
| `fixtures.ts`    | Built-in fixtures — mechanism reconstructions of public incidents + labeled synthetics    |
| `engine.ts`      | Deterministic replay against a policy; per-step detection codes, verdict, false positives |
| `attestation.ts` | `OracleScenarioRun` EIP-712 attestation: sign + verify, frozen v1 layout                  |

## Detection codes

`STALE_DATA`, `MAX_DEVIATION`, `INSUFFICIENT_QUORUM` mirror the Oracle Watch
reason codes; `ANOMALY_ELEVATED` reuses the unsupervised detector from
`src/lib/anomaly`; `PRECISION_DRIFT` catches cumulative sub-threshold drift
(the rounding-accumulation class a single-source deviation check can never see).

## API

- `GET /api/v1/testing/scenarios` — scenario catalog with provenance
- `POST /api/v1/testing/runs` — `{ scenarioId }` or `{ scenario }`; returns the
  deterministic result plus a signed attestation when an attester key exists
- `POST /api/v1/testing/attestations/verify` — open verification endpoint

## Fact discipline

Fixtures marked `public_incident` reconstruct the failure MECHANISM of a
publicly documented event. Prices and anchors are synthetic reconstructions,
never a claim about real historical market data. See `fixtures.ts`.
