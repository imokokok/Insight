# Directory submission runbook

## GitHub PR surfaces

1. Fork the target directory from the user's authenticated GitHub account.
2. Copy the package from `skills/insight-pre-trade-safety` and the matching
   prepared entry from this directory. Do not strip the safety boundary or add
   credentials.
3. Follow the target repository's current contribution guide, run its required
   checks, and open one narrowly scoped PR.
4. Record the URL, requested changes, and merged/rejected status in the
   distribution ledger. Do not resubmit to the same directory while an earlier
   PR is open.

Submitted targets are `sendaifun/skills` (Oracle category),
`solana-foundation/awesome-solana-ai`, and
`sendaifun/awesome-solana-mcp-servers`. Keep the submitted links in the
distribution ledger, respond to maintainer review, and do not open a duplicate
PR while the current one remains open.

## Form and account surfaces

`mcp.so`, `mcpservers.org`, PulseMCP, Smithery and x402scan may require browser
login, platform terms, an account token, or a wallet SIWX signature. Prepare
the source links and the no-money discovery result first, but obtain the
account-holder's confirmation for any form submission, terms acceptance, token
creation, or wallet signature. Never place those secrets in a Skill archive.

## Prepared material (ready to paste)

| Surface                         | Prepared entry                                   | Open PR                                                                 |
| ------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| SendAI Skills (Oracle category) | `sendaifun/PR-BODY.md`, `marketplace-entry.json` | [#113](https://github.com/sendaifun/skills/pull/113)                    |
| Awesome Solana AI               | `awesome-solana-ai-entry.md`                     | [#275](https://github.com/solana-foundation/awesome-solana-ai/pull/275) |
| Awesome Solana MCP Servers      | `awesome-solana-mcp-entry.md`                    | [#56](https://github.com/sendaifun/awesome-solana-mcp-servers/pull/56)  |

All three PRs were opened 2026-10-30 and remain open as of 2026-11-06. #275
has a clean automated review (Greptile 5/5, low impact). The remaining action
is maintainer review, not new content. If a maintainer requests a change, edit
the corresponding prepared entry here first, then update the PR.

Shared facts for every form or listing:

- Remote MCP endpoint: `https://www.oracleinsight.xyz/api/mcp`
- Discovery manifest: `https://www.oracleinsight.xyz/.well-known/x402` (18 paid resources)
- OpenAPI: `https://www.oracleinsight.xyz/openapi.json`
- Skill source: `skills/insight-pre-trade-safety` (no credentials, no wallet logic)
- Free discovery: `initialize`, `tools/list`, `ping` need no credential
- Paid calls: x402 v2 USDC or `X-API-Key` credit wallet
- No-wallet path: signup + email verification → one-time 100 credits →
  `X-API-Key` (a 402 carries the `x-insight-no-wallet` hint)
- One-command install:
  `npx -y --package=oracle-insight-mcp insight-mcp` (pins the hosted endpoint
  and the `mcp` attribution label; `INSIGHT_MCP_URL` / `INSIGHT_API_KEY` override
  them in the MCP host's `env` block)
- Safety boundary: assessment only; no custody, no signing, no broadcast

## Account-gated actions (account holder only)

These are browser or wallet actions. An agent may prepare the text but must not
accept terms, create tokens, or sign a wallet message on the account holder's
behalf:

| Surface                           | Gate                             |
| --------------------------------- | -------------------------------- |
| Smithery, Glama                   | GitHub or platform login         |
| mcp.so, mcpservers.org, PulseMCP  | form submission / platform terms |
| x402scan                          | wallet SIWX signature            |
| CDP Bazaar / facilitator catalogs | facilitator-side indexing check  |

Paste the shared facts above, then verify the listing by fetching its public
page and by checking `acquisition_source` in the weekly audit. A listing is not
"live" until both checks pass.

## npm 2FA gate and staged releases

The npm account (`pengyutao`) enforces two-factor authentication. The publish
token has `bypass_2fa: false`, so direct `npm publish` and `npm stage approve`
both return `EOTP`; the account's only `bypass_2fa: true` token expired on
2026-09-10. [npm is also removing direct publish from bypass-2FA granular
tokens](https://github.blog/changelog/2026-07-31-restricting-npm-bypass-2fa-granular-access-tokens/)
in January 2027. An agent cannot satisfy a proof-of-presence 2FA challenge.

Both `0.1.0` tarballs were submitted with `npx npm@11 stage publish`, which
needs no 2FA, then approved by the maintainer on npmjs.com (Staged Packages
tab). Approval was the only step that made
`npx -y --package=oracle-insight-mcp insight-mcp` and
`npm install elizaos-plugin-oracle-insight` work: before it, npm served only the
public `0.0.0-stage` placeholder, which has no usable binary.

The switch to the branded launcher was gated on both of these succeeding before
merge. Re-run them after any registry incident:

```bash
npm view oracle-insight-mcp@0.1.0 version
npm view elizaos-plugin-oracle-insight@0.1.0 version
```

A staged version occupies the same semver index as a published one, so never
attempt a separate `npm publish` of a staged version. For a manual release the
alternatives are `npm publish --access public --otp=<6-digit-code>` or
`npx --yes npm@11 stage approve <stage-id> --otp=<6-digit-code>`; an agent
cannot satisfy that proof-of-presence challenge on its own.

### Tokenless releases after 0.1.0

`.github/workflows/agent-packages-release.yml` publishes both packages from
GitHub Actions over npm Trusted Publishing (OIDC) with provenance, mirroring
`sdk-release.yml`. One-time maintainer setup on npmjs.com per package:

1. Open the package settings and add a Trusted Publisher for GitHub Actions.
2. Set organization/user `imokokok`, repository `Insight`, workflow filename
   `agent-packages-release.yml` (filename only, case-sensitive).
3. Allow direct `npm publish`. New configurations default to `npm stage
publish` only, which will not run this workflow.
4. Complete the first successful publish within two days or the configuration
   expires and must be recreated.

Then bump both `package.json` versions and push an `agent-packages-v*` tag.
The workflow verifies `repository.url`, builds the plugin, runs the launcher
tests, and skips any version already live on npm.

## Remaining follow-ups after the launcher switch

The user-facing switch is done: `McpConfigGenerator.tsx` generates the branded
`npx -y --package=oracle-insight-mcp insight-mcp` command, the 402
`x-insight-mcp-install` hint matches it, and `llms.txt` / `skill.md` / the
prepared directory material use the same command. A component test and a guard
test lock both sides in.

1. **Official MCP Registry `packages[]` (account-gated).** `server.json` still
   advertises only the remote URL. When an npm maintainer can use the
   registry's authenticated publish flow, bump `server.json`'s top-level
   `version` and add the following validated entry (schema `2025-12-11` requires
   `registryType`, `identifier` and `transport`; `version` must be exact, never
   a range). Keep the existing `remotes` block.

   ```json
   "packages": [
     {
       "registryType": "npm",
       "identifier": "oracle-insight-mcp",
       "version": "0.1.0",
       "transport": { "type": "stdio" },
       "runtimeHint": "npx"
     }
   ]
   ```

   Editing the file alone does not update the registry; it must be republished
   through that flow, then verified on the public registry page.

2. **Three open directory PRs.** Update the prepared entries with the shorter
   install command only if a maintainer asks for a change. Do not open duplicate
   PRs while #113, #275 and #56 remain open.
3. **ElizaOS plugin directory.** Submit
   `elizaos-plugin-oracle-insight@0.1.0` as a separate listing; it needs the
   platform's authenticated submission flow.
4. **Form / account directories.** Use the shared facts above; none may be
   submitted by an agent on the account holder's behalf.

## Verification loop

```bash
npm run audit:x402 -- --days=7
curl -sS -D- -o /dev/null \
  'https://www.oracleinsight.xyz/api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000' \
  | grep -i 'x-insight-'
```

The curl check must show `x-insight-quickstart`, `x-insight-mcp-install`, and
`x-insight-entry-source-hint`. The audit must start showing non-`unknown`
labels once a Skill, MCP config, or directory link is actually used. If neither
moves after four weeks, stop adding surfaces.
