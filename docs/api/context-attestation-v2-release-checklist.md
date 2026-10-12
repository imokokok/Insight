# Context-attestation V2 release and production acceptance

This checklist covers the local V2 implementation in `src/lib/tokenSecurity/contextAttestation.ts`, the pre-trade API/MCP response, and the standalone `verify-insight-receipt` package. It does not authorize a production deployment or npm publication. The protected-main release process in [production readiness](../operations/production-readiness.md) still applies.

## Before merge

1. Review the source, tests, OpenAPI/MCP descriptions, verifier, synthetic examples, and [`verifier/CHANGELOG.md`](../../verifier/CHANGELOG.md) together. Keep generated `.mjs` files out of source edits; build them from TypeScript.
2. Run the repository release gate on the PR: `npm run validate:ci`. Require the normal `validate`, `smoke`, and `analyze` checks on the current PR head. Run `npm run verifier:release:check` before a package release; add `-- --browser` only when a local Chromium binary is available and its path is configured.
3. Confirm the change remains additive: the existing OracleSafetyCheck attestation layout/domain is unchanged; GoPlus data stays advisory and outside the verdict; fetch/signing failures omit both `contextAttestation` and `tokenSecurity`.
4. Do not publish the package or update the package version until a release is approved. The version in `verifier/package.json` describes the last published version, not this unreleased source change.

## Preview acceptance

Use a preview deployment only after the PR checks pass. Send a low-impact, read-only pre-trade request for a supported Ethereum token (for example `asset=ETH`, `chainId=1`, `action=swap`, `tradeAmountUsd=1`). Use the normal authorized API-key path; do not use a payment path for this check.

The response is wrapped in `data`. Require all of the following:

- When GoPlus returns a valid record and signing is configured, `data.contextAttestation.schemaVersion` is `2`, its manifest is `context-attestation.v2`, and `data.tokenSecurity.schema` is `insight.token-security-view.v1`.
- Run the packed standalone CLI using an independently reviewed registry snapshot and a SHA-256 pin obtained through the established key-review process. Do not trust a registry or pin supplied by the response bundle.
- The CLI output reports `accepted: true`, `valid: true`, `resultLinked: true`, `keyStatus: "valid"`, and a non-sample signer. Record the package version, exact registry hash, request ID, response timestamp, and CLI output in release evidence.
- Change one field in a copy of `data.tokenSecurity` and confirm the CLI rejects the modified view. Do not use the modified copy as a live request.
- When the upstream fetch or signing path fails, confirm the advisory evidence fields are omitted and the existing verdict response still follows its normal behavior. Never interpret missing evidence as a clean scan.

For local verification, save only the API response body and the independently sourced registry snapshot in a restricted temporary directory. Extract the signed fields from the `data` object:

```sh
jq -e '.data.contextAttestation' response.json > context-attestation.json
jq -e '.data.tokenSecurity' response.json > token-security-view.json
verify-insight-offline \
  --registry reviewed-registry.json \
  --registry-sha256 "$REVIEWED_REGISTRY_SHA256" \
  --context-attestation context-attestation.json \
  --token-security-view token-security-view.json
```

The response body contains no API credential when captured from `curl` output; never save request headers. Keep the attestation and view together because V2 binds the exact normalized view.

## Production GoPlus check

After production promotion, repeat the same low-impact request once and record whether it returned a signed V2 view. A successful request must reach GoPlus and return a valid token record; a configured credential (`keyed: true`) alone is not success. If DNS, network access, GoPlus, or signing is unavailable, record the specific failure and leave the evidence fields omitted. Do not add retry loops, increase request volume, or make a paid call to force a green result.

The signed `rawResponseSha256` is a digest of the source body, but the raw body is intentionally not persisted or returned. Consequently, the verifier can authenticate the signer’s statement and link the exact returned normalized view, but it cannot replay GoPlus parsing or independently establish source truth. It also cannot prove that an agent consumed the view.

## Rollback and release record

If response validation, signing, key admission, view binding, or verifier behavior fails, stop promotion and use the established Vercel rollback process. Since this is an advisory lane, an absent field is the safe degraded behavior; do not change the verdict to compensate for missing evidence. Preserve the failed response, request ID, deployment SHA, registry snapshot hash, and CLI result without API credentials.

Only after preview and production acceptance should a separate package-release decision update the npm version, run `npm run verifier:release:check`, publish `verify-insight-receipt`, and verify the published tarball/version. Production evidence and package publication status must be reported separately.
