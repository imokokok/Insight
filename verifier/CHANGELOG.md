# Changelog

## Unreleased

- Expire genuinely signed v1 receipts whose `checkedAt` is the Unix epoch, and make the key validity end exclusive in line with the application verifier.
- Fail closed on malformed or ambiguous directly supplied key registries. Add standalone verifier regression tests and reject invalid optional telemetry timeouts.

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
