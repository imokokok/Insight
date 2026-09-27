# Changelog

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
