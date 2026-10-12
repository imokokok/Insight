# Changelog

## Unreleased

- Verify signed decision-input context attestations and the exact normalized token-security view; accept V2 only when the signature, view digest, pinned key registry, validity window, and non-sample key role all pass.
- Continue recognizing V1 signatures as legacy evidence while reporting that the returned view is not linked; keep the standalone verifier fail-closed for that layout.
- Add synthetic clean/risk fixtures. Their sample-role signer is deliberately rejected for production acceptance.
- Preserve the evidence boundary: the raw GoPlus body is not included, so offline verification cannot replay source parsing or prove source truth or agent consumption.

## 0.4.0 — 2026-10-04

- Add `OracleScenarioRun` v1 (13 fields): the scenario-testing harness receipt, so a test run is verifiable offline like every other Insight line.
- Route that family by `primaryType` before the numeric schema-version checks. It carries `schemaVersion: 1`, identical to the v1 pre-trade receipt, so the version number alone cannot select the layout.
- Report `kind: 'test'` for this family; `checkedAt` is populated from the receipt's `ranAt` anchor.
- Export `TEST_DOMAIN` / `TEST_TYPES` / `TEST_PRIMARY_TYPE` / `TEST_TYPE`, `toTestRunMessage`, and `TestRunMessage`, and add `testRun` to the `SchemaId` registry maps.
- Widen the telemetry report payload's `kind` to include `'test'`. The payload shape is unchanged, so `REPORT_SCHEMA_VERSION` stays at 1; a consumer that switches exhaustively on `kind` should treat `'test'` as part of the `'check'` family.

Additive: no existing layout, digest, signature, registry release, attester key or partner policy changed.

## 0.3.1 — 2026-09-28

- Require registry roles to be strings. Reject one-element arrays such as `["sample"]` instead of coercing them during validation, preserving the exact role used by downstream trust checks.
- Add packed-artifact regression cases for both sample and attester role arrays.

## 0.3.0

- Support ExecutionReceipt v1–v5 and immutable v5 semantic profile admission.
- Add exact-byte SHA-256 pinned registry parsing for independently configured trust.
- Add `verify-insight-offline`, with local-file input, stable JSON output and failing exit codes.
- Reject malformed execution-pair UIDs without an uncaught hash exception.
- Verify the packed distribution in clean Node consumers and Chromium, including historical layouts and negative trust/profile cases.

Registry publication is recorded separately in the repository release acceptance record.
