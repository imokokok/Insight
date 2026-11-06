# oracle-insight-mcp

One-command MCP launcher for [Insight](https://www.oracleinsight.xyz). It lets a
stdio-only MCP host (Claude Desktop, Cursor, Windsurf, ElizaOS, Docker MCP
Gateway, Smithery) connect to the hosted Insight MCP server without a local
checkout, a build step, or an API key.

The launcher is a thin wrapper around the published
[`mcp-remote`](https://www.npmjs.com/package/mcp-remote) bridge. It pins the
Insight endpoint and the bounded attribution header so agent configs stay one
line long. It contains no Insight source, no credentials, and no payment logic.

## Install

```json
{
  "mcpServers": {
    "insight": {
      "command": "npx",
      "args": ["-y", "--package=oracle-insight-mcp", "insight-mcp"]
    }
  }
}
```

Or run it directly:

```bash
npx -y --package=oracle-insight-mcp insight-mcp
```

`initialize`, `tools/list`, and `ping` are free. `tools/call` is paid per call
via x402 (USDC, no signup) or metered against a credit wallet when
`INSIGHT_API_KEY` is set. The launcher never sees a private key. An x402 wallet
is configured in the calling agent runtime, not here.

## No-wallet trial

If the agent has no wallet, use the credit rail. Sign up at
https://www.oracleinsight.xyz, verify the email address (a one-time,
idempotent 100-credit grant is issued — about 20 C3 decisions), create a key
at https://www.oracleinsight.xyz/settings?tab=api-keys, and put it in the MCP
host config's `env` block:

```json
{
  "mcpServers": {
    "insight": {
      "command": "npx",
      "args": ["-y", "--package=oracle-insight-mcp", "insight-mcp"],
      "env": { "INSIGHT_API_KEY": "ins_..." }
    }
  }
}
```

The launcher passes `${INSIGHT_API_KEY}` as a placeholder and `mcp-remote`
expands it from the child environment, so the key never appears in `argv` or
in this package. Calls then meter against the credit wallet instead of x402.
This is a one-time, email-verified, per-account grant — not an anonymous or
recurring free tier. Verdicts and the safety boundary are identical.

## Environment

| Variable               | Default                                 | Meaning                                                                                            |
| ---------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `INSIGHT_MCP_URL`      | `https://www.oracleinsight.xyz/api/mcp` | Override the hosted endpoint (self-hosted or staging deployments).                                 |
| `INSIGHT_API_KEY`      | unset                                   | Optional credit-wallet key. Expanded by `mcp-remote` from the environment, never placed in `argv`. |
| `INSIGHT_ENTRY_SOURCE` | `mcp`                                   | Optional bounded attribution label (see below).                                                    |

Extra CLI arguments are forwarded to `mcp-remote`, for example
`--header "X-Custom:value"`.

## Attribution

Every request carries `x-insight-entry-source` with one bounded,
non-identifying label: `direct`, `docs`, `bazaar`, `mcp`, `sdk`, `skill`,
`wallet_mcp`, `sendaifun`, `solana_directory`, or `unknown`. It is aggregate
conversion metadata only. It never affects pricing, authorization, payment
verification, or settlement, and an unknown value is rejected rather than
forwarded. Never put a wallet address, API key, or free-form campaign value in
this header.

## Safety boundary

Insight returns evidence about decision inputs. A `PASS` is not permission to
trade, and a `BLOCK` is a completed check. Insight does not custody funds,
sign, broadcast, select a route, or guarantee an outcome.

## Development

```bash
node --test test/*.test.mjs
npm pack --dry-run
```

`mcpName` in `package.json` is not npm metadata. The official MCP Registry uses
it to prove package ownership: when `server.json` declares this package, the
registry fetches `https://registry.npmjs.org/oracle-insight-mcp/<version>` and
requires that version's `mcpName` to equal `server.json.name` exactly
(`io.github.imokokok/insight-oracle`). Removing or renaming the field makes a
schema-valid `server.json` fail at publish time. `npm run mcp:registry:check` at
the repository root enforces the parity, and `server.json` always pins the exact
version carrying the field. `0.1.1` has no `mcpName`; that is why the registry
entry needs `0.1.2` or newer.

Publishing requires the maintainer's npm account. The name is deliberately
unscoped: the npm organization `@oracleinsight` does not exist, and npm requires
an organization to be created before any package can be published under that
scope. `oracle-insight-mcp` matches the existing `oracle-insight-guard` and
`verify-insight-receipt` packages owned by the same account.

The account enforces two-factor authentication on publish. A granular access
token with `bypass_2fa: false` therefore cannot publish directly (`EOTP`), and
npm is [removing direct publish from bypass-2FA
tokens](https://github.blog/changelog/2026-07-31-restricting-npm-bypass-2fa-granular-access-tokens/)
in January 2027. Use one of the two supported paths:

```bash
# Path A: direct publish (2FA is confirmed with a WebAuthn security key / Touch ID)
npm publish --access public
# Legacy TOTP accounts only: append --otp=<6-digit-code> from the bound authenticator app

# Path B: stage without 2FA, then approve on npmjs.com
npx --yes npm@11 stage publish
```

The approval is under the **profile avatar → Staged Packages** menu (below
`Access Tokens`), not under Account settings. Click **Approve** and confirm with
the security key. npm does not email or text a code; a 6-digit OTP exists only
for accounts still on legacy TOTP. Recovery codes are for account login, not
publishing, and using one triggers a 72-hour security hold.

After the first release, use `.github/workflows/agent-packages-release.yml`: it
publishes this package and the ElizaOS plugin from GitHub Actions over npm
Trusted Publishing (OIDC, no long-lived token) with provenance. It mirrors
`sdk-release.yml`, which already publishes the SDK and verifier that way.
Trigger it with an `agent-packages-v*` tag after bumping the package versions.
For each package, an npm maintainer must first add a Trusted Publisher on
npmjs.com with repository `imokokok/Insight`, workflow filename
`agent-packages-release.yml`, and direct `npm publish` allowed. See the
distribution runbook for the exact sequence.

`0.1.0`, `0.1.1` and `0.1.2` were released through staged publishing plus a
maintainer approval on npmjs.com. `0.1.2` is the current `latest` and is the
first version with `mcpName`, so pin it or newer anywhere the official MCP
Registry is involved.

The broken `0.1.0` compared `process.argv[1]` with `import.meta.url`, which is
false under npm's `node_modules/.bin` symlink, so `npx insight-mcp` exited `0`
without starting the bridge. `0.1.1` removes that guard — `bin/insight-mcp.mjs` is a pure CLI
entry that always runs, the importable logic lives in `lib/remote-args.mjs`,
and `test/binSymlink.test.mjs` executes the real bin through both a `.bin`
symlink and its shebang.

The generated MCP configs in
`src/app/mcp/components/McpConfigGenerator.tsx`, the 402 install hint, and the
discovery docs use this command; they were switched only after
`npm view oracle-insight-mcp@0.1.1 version` succeeded.
