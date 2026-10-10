# Security Policy

## Reporting a vulnerability

Email **imokokok123@gmail.com**, or use GitHub's private vulnerability reporting on this repository.

Please **do not open a public issue** for anything you believe is exploitable.

Include what you can of:

- Affected package and version (`verify-insight-receipt`, `oracle-insight-guard`) or commit / deployment
- A minimal offline reproduction (exact commands, exact bytes)
- The exact fail-closed code you expected versus the result you observed — an unexpected _pass_ is the highest-severity class here
- Any registry snapshot bytes needed to rerun your case

## Scope

In scope: anything that could let signed evidence be forged, accepted when it should fail closed, or attributed to a key that should not be trusted. Examples: cryptographic verification bugs, schema routing errors (including `OracleScenarioRun` vs v1 `OracleSafetyCheck`), key-registry parsing, offline CLI behavior, and server-side issuance paths (pre-trade safety API, MCP endpoint).

Out of scope: the _meaning_ of a valid receipt (a receipt attests what the oracle observed at a moment; it is evidence, not endorsement and not advice), availability of public verification counters, and reports that only apply to modified or unsigned inputs.

## What to expect

- Acknowledgement within 5 business days
- Status updates at least weekly until resolution
- Credit in release notes if you want it — say so in your report

## Supported versions

Security fixes target the latest published release of each package. Older versions are fixed at maintainer discretion.
