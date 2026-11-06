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
# Path A: direct publish with a current authenticator code
npm publish --access public --otp=<6-digit-code>

# Path B: stage without 2FA, then approve on npmjs.com (Staged Packages tab)
npx --yes npm@11 stage publish
```

The repository's `sdk-release.yml` already publishes the SDK and verifier via
npm Trusted Publishing (OIDC, no long-lived token). Once this package exists on
npm and a trusted publisher is configured for it, releases should move to the
same mechanism rather than relying on tokens.

After publishing, the generated MCP configs in
`src/app/mcp/components/McpConfigGenerator.tsx` can switch from the explicit
`mcp-remote` command to `['-y', '--package=oracle-insight-mcp', 'insight-mcp']`.
