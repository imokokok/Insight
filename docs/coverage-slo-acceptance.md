# Coverage readiness v1 — local acceptance, 2026-09-20

Implemented the design in `coverage-slo-design.md` across Insight and PriorSeal.
Existing partner activations and signed pre-trade/execution wire layouts are
unchanged. Consumers explicitly opt in to the new coverage domain and policy.

## Verified

- Insight governance, lint, formatting, application/script types and knip pass.
- Insight full Jest run: 209 suites passed, 1 skipped; 2036 tests passed, 1
  skipped. The final SLO rounding boundary was also verified in its focused suite.
- Insight SDK: 94 tests passed, including real EIP-712 coverage signatures,
  wrong scope/key/policy, duplicate sources, expiry while signing, missing
  authorization commitments and no provider entry on failure.
- Reliability tests: 5 passed, including executing migration 0056 in embedded
  PostgreSQL: missing slots, distinct chains, first-write preservation,
  backfill refusal, incomplete-slot exclusion and restricted table privileges.
- Production Next build and homepage transfer budget pass. A sandbox socket
  failure persisted in Turbopack's build cache; preserving and moving that cache
  and rebuilding outside the sandbox resolved the environmental failure.
- Chromium smoke: the six existing cases passed; the new coverage case passed
  after supplying a syntactically valid assessment query to reach auth middleware.
  Unauthenticated coverage/policy/SLO/cron calls are rejected and Ops redirects
  to login. Missing required query fields are rejected by shared validation first.
- PriorSeal `npm run check` passes, including SDK types/build, complete Node test
  suite, Solidity compile, web build and performance budget. Nine new binding
  tests verify scope/trust, capped expiry and refusals before provider entry.
- The two SDK coverage verifier source files are byte-identical. No runtime
  dependency on the other checkout is required.

## Production activation status

Production migration 0056 is applied and the dedicated coverage signer is
provisioned in the Vercel production environment. Its public address, validity
interval and policy pin are published in the reviewed trust reference described
by `coverage-slo-runbook.md`. No funded transaction or partner activation is
required or implied. Deployment, first production sampling and online
verification remain release operations rather than claims established by local
tests.

Real-world availability and the internal 99% objective must be measured after
enrollment. Deterministic fixtures and a local build establish implementation
behavior, not achieved production SLOs, continuous uptime or partner adoption.
