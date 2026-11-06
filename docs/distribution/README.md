# Agent distribution materials

These materials package Insight for existing Agent and MCP surfaces. They are
submission-ready content, not claims of approval. Keep the funnel deliberately
narrow: **install → free discovery → one decision call → a bounded action
handoff → evidence review**.

Status verified 2026-11-06 against the public PR pages. A directory listing,
marketplace acceptance, payment configuration, or a wallet integration is not
"live" until its own verification and required user or partner approval are
complete.

| Surface                        | Package                                                     | Status (2026-11-06)                                                                                                                                                                                                                                              | Required remaining authority                                   |
| ------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Official MCP Registry          | `io.github.imokokok/insight-oracle`                         | already published (`server.json`); no release needed for these changes                                                                                                                                                                                           | release only when product changes require it                   |
| GitHub Agent Skill directories | `insight-pre-trade-safety`                                  | [SendAI Skills PR #113](https://github.com/sendaifun/skills/pull/113) **open**, opened 2026-10-30, no maintainer response yet                                                                                                                                    | maintainer review                                              |
| Solana Agent directories       | same Skill / Oracle category                                | [Awesome Solana AI PR #275](https://github.com/solana-foundation/awesome-solana-ai/pull/275) **open**, Greptile 5/5 low-impact review, not merged; [Awesome Solana MCP Servers PR #56](https://github.com/sendaifun/awesome-solana-mcp-servers/pull/56) **open** | maintainer review (both)                                       |
| npm MCP launcher               | `oracle-insight-mcp` (`mcp-launcher/`)                      | `0.1.1` **published and verified through a `.bin` symlink**; `0.1.0` is a broken no-op and must not be pinned. Generated MCP configs, `llms.txt`, `skill.md` and the 402 install hint use the branded launcher                                                   | none; later releases via `agent-packages-release.yml` (OIDC)   |
| npm ElizaOS plugin             | `elizaos-plugin-oracle-insight` (`integrations/`)           | `0.1.0` **published**; build + pack verified                                                                                                                                                                                                                     | plugin directory listing (account-gated)                       |
| Wallet/Agent runtime           | `insight-lending-guard` + PriorSeal Guarded Action          | developer preview prepared                                                                                                                                                                                                                                       | target runtime's integration review and user wallet approval   |
| Form / account directories     | Smithery, Glama, mcp.so, mcpservers.org, PulseMCP, x402scan | unsubmitted; see [runbook](directory-submission-runbook.md)                                                                                                                                                                                                      | account holder: browser login, terms, token, or SIWX signature |
| x402 discovery surfaces        | public manifest/OpenAPI                                     | technically discoverable; `.well-known/x402` exposes 18 paid resources                                                                                                                                                                                           | account/SIWX or facilitator-specific submission when required  |

## Current blockers, in ROI order

1. **Three open directory PRs.** All three are maintainer-gated and need no
   code change. Respond to review comments if any arrive; do not open duplicate
   PRs while these are open. PR #275 already has a clean automated review.
2. **Registry follow-ups after 0.1.1.** The official MCP Registry entry
   (`server.json`) still advertises only the remote URL; adding an npm
   `packages[]` entry and republishing it needs the registry's authenticated
   publish flow. The ElizaOS plugin also still needs its own plugin-directory
   listing. Both are account-gated and prepared in the runbook.
3. **Account-gated directory forms.** The runbook lists each form and the
   exact material to paste. An agent must not accept terms, create tokens, or
   sign a wallet message on the account holder's behalf.
4. **Attribution was blind.** `supabase/migrations/0122` widens the database
   CHECK to the full ten-label vocabulary, the Skill/quickstart/MCP configs now
   send `x-insight-entry-source`, and the 402 response carries onboarding
   hints. Without these, no distribution channel can be evaluated.

## First paid call without a wallet

P3 is implemented as discovery, not billing. The repository already issues a
one-time, email-verified, idempotent 100-credit signup grant
(`src/app/api/billing/signup-grant/route.ts`) and meters `X-API-Key` calls
against the credit wallet. The 402 response now carries `x-insight-no-wallet`,
and `llms.txt`, `skill.md`, the x402 quickstart, the `/docs/x402` page and the
launcher README spell out the three steps.

No anonymous free tier was added. `plans.ts`, `quotaMiddleware.ts` and
`mcp/middleware.ts` all state "no recurring free tier"; auto-issuing an
anonymous key would require a shadow-account and quota subsystem, changes
across roughly ten payment-dispatch points, and a new audit status — while
`docs/operations/agent-distribution-funnel.md` forbids new per-user
identifiers and new telemetry. An anonymous allowance can also be farmed by
rotating IPs. If it is ever wanted, it belongs in its own project with an
explicit abuse model, not in a distribution PR.

## Verification

After each distribution action, measure rather than assume:

```bash
npm run audit:x402 -- --days=7          # byAcquisitionSource breakdown
npm run audit:x402 -- --days=30 --json  # machine-readable baseline
```

Watch for non-`unknown` labels (`skill`, `mcp`, `sendaifun`,
`solana_directory`, `wallet_mcp`) and for a rise in signed retries after the 402. If four weeks after the PRs and npm releases every source is still
`unknown` and the 402-to-signed-retry rate stays below 1%, the agent-native
channel is not opening; stop adding surfaces and revisit the channel rather
than adding capability.

Do not call a directory listing, marketplace acceptance, payment
configuration, or a wallet integration "live" until its own verification and
required user or partner approval are complete.
