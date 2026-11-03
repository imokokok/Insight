# Foundry Harness (scaffold)

Real-contract execution layer for the Oracle Scenario Testing harness. The
TypeScript engine (`src/lib/testing/oracleScenario/`) is the deterministic
core; this scaffold is where scenarios get replayed against ACTUAL protocol
contracts on a mainnet fork.

Status: **scaffold, not yet wired.** Foundry is not part of the repo's Node
toolchain; CI does not compile this directory.

## Planned wiring

1. Export scenarios as JSON: `GET /api/v1/testing/scenarios` (same bytes the
   TypeScript engine hashes and signs).
2. `anvil --fork-url <ARCHIVE_RPC>` — the Alchemy/Infura free tiers include
   archive data access, enough for development-scale forking.
3. A Solidity harness (`OracleScenarioHarness.t.sol`) reads the scenario JSON
   via `vm.readFile` / `vm.parseJson`, deploys a mock price feed, replays the
   step sequence block by block (`vm.warp`, `vm.roll`), and asserts the same
   detection outcomes the TypeScript engine reports.
4. `forge test` produces pass/fail per step; results are bound into the same
   `OracleScenarioRun` attestation family with `executor: "foundry"`.

## Prerequisites

```bash
curl -L https://foundry.paradigm.xyz | bash   # installs foundryup
foundryup                                     # forge, anvil, cast
```

## Why this stays out of CI for now

The TS engine covers the DSL, determinism, detection policy and signing. The
Foundry layer adds real-contract settlement behavior and needs an RPC secret;
it lands as its own workflow once the first target protocol harness is chosen
(recommended first target: a minimal vault that settles against a price feed).
