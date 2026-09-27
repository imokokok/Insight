# Priority implementation acceptance — 2026-09-27

Implemented the first three technical priorities with the PriorSeal checkout: standalone verifier delivery, strict source quality/freshness diagnostics, and a concrete durable RWA executor.

## Insight changes

- `verifier/src/snapshot.ts`: independently configured exact-byte registry pins and strict key-record parsing.
- `verifier/src/offline.mts`: local-file CLI with explicit trust pins, JSON outcomes and failing exit codes.
- `scripts/check-verifier-release.mts`: pack, clean-install and validate the actual artifact in CommonJS, ESM and Chromium. Publication from source runs this gate.
- `src/lib/coverage/observations.ts`: shared scope/time conversion for signed coverage and unsigned diagnostics.
- Public npm version constants are generated from the registry so installation instructions advertise verifier 0.3.0.
- Coverage diagnostics schema v2: classified groups only, explicit actual scope/quorum provenance, duplicate exclusion, source-time freshness and conservative contradictory-age handling.
- Immutable promotion v22 and all nine partner compatibility entries; historical signed layouts, source-group mappings, keys and partner activation remain unchanged.

The registry parser requires a hash from independently reviewed consumer configuration. The classification policy does not prove cryptographic upstream independence. Diagnostics remain unsigned and do not establish trade safety or a production SLA.

## Verification

Full CI checks passed locally: 2242 Jest tests passed with one existing skip, 183 SDK tests and 30 reliability tests passed. The final affected-route/profile/registry regression selection passed 87 tests. Type checking, lint, format, generated cron parity, source locks, workflow security and protocol checks passed.

The final `verify-insight-receipt@0.3.0` tarball was installed in an independent temporary consumer and verified in Node and Chromium. The clean consumer resolved Viem 2.56.9. All pre-trade/recheck layouts and ExecutionReceipt v1–v5, negative trust/profile cases and historical pairing were checked. Files and exact hashes are in `.local/verifier-release/manifest.json`.

Application Webpack build passed, and the homepage initial JavaScript budget passed at 306 KB gzip. The local sandbox blocked Turbopack's internal port binding. Same-commit production CI and browser smoke still govern deployment.

## Publication status

[`verify-insight-receipt@0.3.0`](https://www.npmjs.com/package/verify-insight-receipt/v/0.3.0) is published, with `latest` pointing to 0.3.0. After the user completed npm web authentication, the exact validated tarball was submitted. The public registry artifact was independently downloaded and verified at 2026-09-27T15:23:26.008Z (23:23:26 Asia/Shanghai): SHA-256 `7e480c4fe9ff14b0a770e42c012cccead5c446efe1fed55000611ca38f4c50ab`, 28,757 bytes, and matching npm integrity. A clean registry-installed consumer passed all Node/CLI cases and Chromium offline pairing. See `.local/verifier-release/registry-verification.json`.

The Insight root dependency and PriorSeal SDK source dependency/lockfiles now pin 0.3.0. The PriorSeal compatibility entry point re-exports the upstream execution verifier, retaining its import path. Insight type checking, PriorSeal SDK build and all 395 PriorSeal tests passed after the dependency update. No new PriorSeal SDK version was published.

This document captures acceptance before Git delivery. Subsequent commits, pushes and the gated production deployment are tracked by remote SHAs and the [Quality Gate](https://github.com/imokokok/Insight/actions/workflows/ci.yml). Partner activation, production database migrations and funded transactions are outside this delivery. PriorSeal's optional Node/PostgreSQL executor is documented in its `docs/runbooks/rwa-node-executor.md`; its local EVM fixture checks real valueless token transfers and database-restore replay protection. It does not establish production RWA issuer facts.
