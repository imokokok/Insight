# Context Attestation V2 acceptance record — 2026-10-13

## Scope

Acceptance was performed against commit `c487be19b51760ed047fba4a37842739ab440281` (PR #186), using one low-impact authenticated pre-trade request on Preview and one on Production. Both requests used `asset=ETH`, `chainId=1`, `action=swap`, and `tradeAmountUsd=1`.

The independently retrieved Production registry snapshot had SHA-256 `89d595cfb8402f2cf366b421b48e7c72d090b7c0e765f2f1f18bb17ec30da956`. It listed the active non-sample Insight key `0x6506F789Edd43338A416f59822A63F309f97E8ce` and no revoked keys.

## Preview result

- Deployment: `dpl_CTHxCCXERZsf9BQRmo5mZSfNpUYs` (`https://insight-7absd849i-imokokoks-projects.vercel.app`), source commit `c487be19b51760ed047fba4a37842739ab440281`.
- Response: HTTP 200, verdict `PASS`, request ID `req_46e54a7c717345cfa0a857ab67bee249`, response timestamp `2026-10-12T17:47:59.800Z` (2026-10-13 01:47:59.800 Asia/Shanghai).
- `data.contextAttestation` and `data.tokenSecurity` were absent. The existing V1 oracle attestation remained present and used the active non-sample registry key.
- The matching Preview runtime log reported `GoPlus token_security fetch failed; advisory omitted` with error `fetch failed`.

## Production result

- Deployment: `dpl_D9ApuYmqLXwZk2je5UTVrFjL9tzr`, promoted for source commit `c487be19b51760ed047fba4a37842739ab440281`.
- Response: HTTP 200, verdict `PASS`, request ID `req_1f553ea42adc4f23bd254c4d3a78fff2`, response timestamp `2026-10-12T17:52:09.220Z` (2026-10-13 01:52:09.220 Asia/Shanghai).
- `data.contextAttestation` and `data.tokenSecurity` were absent. The existing V1 oracle attestation remained present and used the active non-sample registry key.
- The matching Production runtime log reported `GoPlus token_security fetch failed; advisory omitted` with error `fetch failed`.
- Vercel production metadata listed both `GOPLUS_API_KEY` and `ATTESTATION_SIGNER_PRIVATE_KEY`; their values were not read or recorded.

## Conclusion and limitation

Preview and Production both exercised the documented safe-degradation path: the upstream fetch failed, advisory evidence fields were omitted, and the ordinary verdict response remained `PASS`. Missing evidence is not a clean GoPlus scan and is not a positive Context Attestation V2 result.

No live V2 envelope or normalized token-security view was returned, so the offline CLI could not be run against a live response and a live tamper-negative check was not applicable. The package release check covers packed synthetic conformance only; it does not replace positive production-issuer evidence. No retry or additional paid request was made.

## Packed verifier release check

- Package: `verify-insight-receipt@0.5.0`.
- Packed tarball SHA-256: `039ea12e077e27317e6990b9e124dede3ae70433e00050f5ef6e6df87a2be956` (38,862 bytes).
- Result: passed. CJS, ESM, offline CLI, V2 synthetic verification, context-view tamper rejection, sample-key rejection, and existing schema/trust regression checks all passed.
- Scope: `PACKED_SYNTHETIC_CONFORMANCE_NOT_PRODUCTION_ISSUER_EVIDENCE`. This result validates the packaged verifier, not a live V2 issuer response.
