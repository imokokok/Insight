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
- One-command install (before the launcher is published):
  `npx -y mcp-remote https://www.oracleinsight.xyz/api/mcp --header x-insight-entry-source:mcp`
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

## After the two npm packages are published

1. Replace the `mcp-remote` command in
   `src/app/mcp/components/McpConfigGenerator.tsx` with
   `['-y', '--package=@oracleinsight/mcp', 'insight-mcp']` (one array, noted in
   the component).
2. Optionally add an npm `packages[]` entry to `server.json` for the official
   MCP Registry, using the published version. Keep the existing remote URL.
3. Update the three directory entries and the form submissions with the
   shorter install command. Do not open duplicate PRs; amend the open ones if a
   maintainer asks.
4. Submit the ElizaOS plugin to the plugin directory as a separate listing.

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
