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

**Where the 2FA challenge comes from.** npm currently uses WebAuthn security
keys (Touch ID / Face ID / Windows Hello / passkey / YubiKey), not a code that
is emailed or texted. A maintainer approves on npmjs.com via **profile avatar →
Staged Packages → Approve** and confirms with a fingerprint or security key.
`--otp` on `npm publish` / `npm stage approve` is a legacy TOTP fallback: the
6-digit value, if this account ever used TOTP, comes from the authenticator app
bound at 2FA setup (1Password, Google Authenticator, etc.) and rotates every 30
seconds. npm recovery codes are **not** OTPs — using one to log in triggers a
72-hour security hold that blocks publishing.

Both first-release tarballs were submitted with `npx npm@11 stage publish`,
which needs no 2FA, then approved by the maintainer on npmjs.com (Staged
Packages tab). Approval was the only step that made
`npm install elizaos-plugin-oracle-insight` work: before it, npm served only the
public `0.0.0-stage` placeholder, which has no usable binary.

`oracle-insight-mcp@0.1.0` was published but is **not usable**: its bin checked
`process.argv[1] === import.meta.url`, which is false under npm's `.bin`
symlink, so the command exited `0` in silence. `0.1.1` fixes it by splitting
the CLI entry from the importable module and adds a regression test that runs
the real bin through a symlink. `0.1.1` is live and is the `latest` tag. Do not
pin `0.1.0` anywhere; `npm deprecate oracle-insight-mcp@0.1.0` still returns
`EOTP` and remains a maintainer-only WebAuthn action.

The switch to the branded launcher was gated on a **working** release. Re-run
these after any registry incident:

```bash
npm view oracle-insight-mcp@0.1.1 version
npm view oracle-insight-mcp dist-tags.latest
npm view elizaos-plugin-oracle-insight version
```

`elizaos-plugin-oracle-insight@0.1.1` is a README-only correction: the `0.1.0`
tarball shipped an Install section saying the package was not published yet and
described a plugin-directory submission that does not exist. It was staged on
2026-11-06 (stage id `82609f29-b33d-4ba8-b597-5e5fa9dca2b9`, shasum
`1b203219ca0e9fb5d44f4b932a82fa9f7884a9c9`) and still needs the maintainer's
WebAuthn approval.

`oracle-insight-mcp@0.1.2` is a metadata-only release adding `mcpName`, which
the official MCP Registry requires to prove npm package ownership. Stage and
approve it before publishing `server.json`; the exact procedure is in the
`MCP Registry: tokenless OIDC release` section below.

The CLI behaviour itself is covered offline by
`mcp-launcher/test/binSymlink.test.mjs`, which stubs `mcp-remote` and asserts
the real bin spawns it through both a `node_modules/.bin` symlink and its
shebang.

A staged version occupies the same semver index as a published one, so never
attempt a separate `npm publish` of a staged version. For a manual release the
alternatives are `npm publish --access public --otp=<6-digit-code>` or
`npx --yes npm@11 stage approve <stage-id> --otp=<6-digit-code>`; an agent
cannot satisfy that proof-of-presence challenge on its own.

### Tokenless releases after 0.1.1

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

1. **Official MCP Registry `packages[]` (repo-side done, publish account-gated).**
   `server.json` stays at top-level `version: 0.3.1` — it was never published —
   keeps the `remotes` block for remote-only clients, and declares one npm
   package (schema `2025-12-11` requires `registryType`, `identifier` and
   `transport`; `transport` is an object with `type`, and `version` must be
   exact, never a range or `latest`):

   ```json
   "packages": [
     {
       "registryType": "npm",
       "identifier": "oracle-insight-mcp",
       "version": "0.1.2",
       "transport": { "type": "stdio" },
       "runtimeHint": "npx"
     }
   ]
   ```

   Schema validity is not enough. The registry's npm validator fetches
   `https://registry.npmjs.org/oracle-insight-mcp/0.1.2` and requires that
   version's `package.json` to contain
   `"mcpName": "io.github.imokokok/insight-oracle"`, matching `server.json.name`
   exactly. `0.1.1` has no `mcpName`, so the earlier declaration would have been
   rejected. Editing the file alone does not update the registry: the public
   entry is still v0.3.0 with only the remote URL. See the tokenless OIDC
   release section below for the publish procedure. Do not bump `server.json`
   again until v0.3.1 has actually been published.

2. **Three open directory PRs.** Update the prepared entries with the shorter
   install command only if a maintainer asks for a change. Do not open duplicate
   PRs while #113, #275 and #56 remain open.
3. **ElizaOS plugin directory (no submission target exists as of 2026-11-06).**
   See the dedicated section below. The package is published and installable
   directly from npm; there is no community registry PR to open.
4. **Form / account directories.** Use the shared facts above; none may be
   submitted by an agent on the account holder's behalf.

## MCP Registry: tokenless OIDC release

`.github/workflows/mcp-registry-release.yml` publishes `server.json` to the
official MCP Registry **without any long-lived secret**. It uses
`mcp-publisher login github-oidc`: GitHub Actions mints an OIDC token for
`imokokok/Insight`, and the registry exchanges it for a token scoped to
`io.github.imokokok/*`. Do not add an `MCP_GITHUB_TOKEN` secret or a PAT for
this workflow. The job requests only `contents: read` and `id-token: write`.

Following the [official GitHub Actions
guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/github-actions.mdx),
the workflow pins `MCP_PUBLISHER_VERSION: v1.8.1`, downloads the release archive
plus its Sigstore bundle, and verifies it with `cosign verify-blob` against
`https://github.com/modelcontextprotocol/registry/.github/workflows/release.yml@refs/tags/v1.8.1`
before extracting the binary. Every `uses:` is pinned to a 40-character commit
SHA because `npm run workflow:check` rejects mutable action refs.

Preconditions, in order:

1. `oracle-insight-mcp@0.1.2` is live on npm. Under the account's WebAuthn 2FA
   this means `npx --yes npm@11 stage publish` from `mcp-launcher/` followed by
   the maintainer's **Staged Packages → Approve** confirmation. `0.1.1` cannot
   be used: it has no `mcpName`.
2. Offline parity passes (also part of `validate:ci:static`):

   ```bash
   npm run mcp:registry:check
   ```

3. The live npm ownership check passes — exactly what the registry will do:

   ```bash
   node scripts/verify-mcp-registry-package.mjs --check-npm
   mcp-publisher validate server.json
   ```

Then publish by tagging the merged commit:

```bash
git tag mcp-registry-v0.3.1
git push origin mcp-registry-v0.3.1
```

`workflow_dispatch` re-runs the same workflow without a new tag (useful after
approving the staged npm package). The job probes
`/v0/servers/<name>/versions/<version>` first and skips publishing when that
exact version is already live, so a retry is safe. A final step re-fetches the
published entry and asserts it actually contains the npm `packages[]` entry.

Verify externally:

```bash
curl -sS \
  'https://registry.modelcontextprotocol.io/v0/servers/io.github.imokokok%2Finsight-oracle/versions/0.3.1' \
  | jq '.server | {name, version, packages}'
```

Expected failure modes: **404 / "not on npm yet"** means the staged version has
not been approved; **"missing required mcpName"** or **"ownership validation
failed"** means the pinned version was built without the field; **"invalid
audience"** means `MCP_PUBLISHER_VERSION` is older than the registry deployment.

Do not call the registry entry "live" until the public API returns v0.3.1 with
`packages[0].identifier == "oracle-insight-mcp"` and
`packages[0].version == "0.1.2"`.

## ElizaOS: community registry is gone, catalog is first-party

Older `elizaOS/eliza` README text and the
[plugin system overview](https://docs.elizaos.ai/plugin-registry/overview) still
point at a "community plugin registry" at `elizaOS-plugins/registry`. Verified
on 2026-11-06:

- `elizaOS/eliza` exists (default branch `develop`). `elizaOS-plugins/registry`,
  `elizaos-plugins/registry`, `elizaOS/registry` and `elizaos/registry` all
  return 404 from the GitHub API. The `elizaos-plugins` organization reports
  `public_repos: 0`, and a code/PR search scoped to that registry returns 422
  "resources do not exist".
- `docs.elizaos.ai/plugins/publishing` and `/plugins/registry` are 404. The
  plugin system overview has a "Community Plugin Registry" heading but no
  submission instructions and no working link.
- The current catalog is explicitly **first-party curated**.
  `packages/core/src/catalog/registry.ts` opens with "First-party curated
  registry — runtime entry point"; `generated.json` is built from 33
  plugin-owned `registry-entry.json` files plus a `curated/` set inside the
  monorepo. Sample entries all use `@elizaos/plugin-*` npm names and
  `elizaos-plugins/*` repositories.
- `registerRegistryEntry()` is a runtime overlay in that newer core, not an
  external listing mechanism, and it is **not exported by `@elizaos/core@1.7.2`**
  (the version this plugin builds against). Do not add a hard call without a
  compatibility change and a new release.

**Actionable path:** do not draft a registry PR. Keep
`elizaos-plugin-oracle-insight` on npm and point agents at direct install plus
the config in `integrations/elizaos-plugin-insight/README.md`. Re-check only if
ElizaOS publishes a new registry repository or submission form; at that point
the entry shape is `registry-entry.json` (`id`, `name`, `description`,
`npmName`, `version`, `source`, `tags`, `config`, `render`, `resources`,
`dependsOn`, `kind`, `subtype`).

## Verification loop

```bash
npm run audit:x402 -- --days=7
curl -sS -D- -o /dev/null \
  'https://www.oracleinsight.xyz/api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000' \
  | grep -iE 'x-insight-|access-control-expose-headers'
curl -sS -D- -o /dev/null 'https://www.oracleinsight.xyz/api/mcp' \
  | grep -iE 'x-insight-|access-control-expose-headers'
```

Both 402 paths now emit the same advisory hints. The REST guard and the MCP
bridge (`handleMcpIndexerQuote` for GET probes, `handleMcpPaidToolCall` for
unsigned POST `tools/call` quotes) share `x402OnboardingHeaders()`; signed but
rejected requests deliberately keep the bare x402 lifecycle shape. The MCP GET
probe also gets CORS headers.

CORS exposure is shared, not duplicated. `src/lib/api/x402/corsExposeHeaders.ts`
owns `X402_ONBOARDING_HEADER_NAMES` and `corsExposeHeaders()`; the REST handler,
the MCP HTTP transport, and both MPP helpers in
`src/lib/api/mpp/preTrade.ts` derive their expose list from it. This matters
because `/api/v1/safety/pre-trade` goes through the MPP path, whose
`mergeChallenges()` **replaces** the header wholesale. Before PR #458 the hints
were present on that 402 but unreadable in a browser. `x402OnboardingHeaders()`
iterates the shared name list, so adding a hint without updating CORS is a
compile error. `src/lib/api/__tests__/cors-onboarding-hints.test.ts` and the
MPP pre-trade tests lock all four surfaces.

The curl checks must show `x-insight-quickstart`, `x-insight-mcp-install`, and
`x-insight-entry-source-hint`. The audit must start showing non-`unknown`
labels once a Skill, MCP config, or directory link is actually used. If neither
moves after four weeks, stop adding surfaces.
