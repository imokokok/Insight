# Insight × PriorSeal Telegram integration

## Product boundary and rollout

Telegram is a read-only assessment and evidence channel. It must never connect to wallets, create an authorization, request a transaction signature, place an order, build or return executable calldata/order envelopes, submit or relay transactions, or reconcile a user transaction.

The controlled pilot exposes Polymarket plus three linked-account-only assessment scenes: Aave V3 Base lending, Hyperliquid BTC/ETH perps, and quote-only Base Aerodrome DEX. The bot requires ordinary text inputs and a separate confirmation; the confirmation remains usable for seven days, and live market data is fetched only after the user confirms. The three scenes do not request JSON, timestamps, wallet addresses, signatures, orders, or transaction data. DEX V1 only shows a reviewed-pool quote/TWAP comparison and always returns `CAUTION` for human review. Linked users pay directly from their existing Insight credit balance only after a trusted signed assessment is produced; failures and undelivered reports are refunded idempotently.

## Account linking

1. The user runs `/link` in their private chat. The bot service requests a random, one-time challenge from `POST /api/telegram/link/start` using `TELEGRAM_INTEGRATION_SECRET`.
2. The user signs in to Insight on `https://www.oracleinsight.xyz/telegram-link` and explicitly confirms the link. Challenges expire after 15 minutes and are stored only as SHA-256 hashes.
3. Insight atomically binds one Telegram account to one authenticated Insight account. The mapping and challenges are service-role-only. The bot can report status and balance without receiving an Insight API key.
4. `/account` shows the linked credit balance and current assessment cost. Every assessment first displays a fresh market midpoint and available (unfrozen) balance; the bot requests the assessment only after the user explicitly confirms. A quote remains usable for at most 120 seconds, with entry gated by a 120-second human review window plus the measured service reserve. Confirmation refreshes the market, midpoint, fee, and balance. A market rollover, price move greater than one live market tick, or fee/balance change invalidates the old quote and requires fresh confirmation. `/usage` shows the user's ten most recent Telegram assessments, `/privacy` opens the privacy notice, and `/help`, `/menu`, and `/cancel` guide the interaction. `/unlink` removes the association. Linking does not create wallet authority.

The PriorSeal Telegram Worker records successful confirmation-to-Telegram-delivery duration without Telegram IDs or request contents. Samples are retained for 30 days (up to 10,000); after at least 1,000 samples, its reserve is `ceil(P99.9 × 1.5)`. The reserve is capped at 60 seconds so a 5-minute market can preserve a 120-second user review window. During cold start it uses this 60-second capacity cap; if measured reserve exceeds 60 seconds, the 5-minute market flow is disabled until service latency supports it. This review reserve is separate from any quote or signature validity period.

Linked users use the Insight credits in their account directly; they do not need to create or expose an API key. A service-only, atomic database function debits the account wallet after a trusted assessment is produced. Each assessment has the stable key `telegram:<hashed-telegram-id>:<telegram-update-id>` so webhook retries cannot debit twice.

## Service routes and secret

Set the same high-entropy `TELEGRAM_INTEGRATION_SECRET` in the Insight deployment and PriorSeal Worker. Store it only as a server-side secret. These service routes reject requests without its bearer token:

- `POST /api/telegram/link/start` — issue a short-lived challenge for a verified Telegram user ID.
- `POST /api/telegram/link/remove` — unlink that Telegram user ID.
- `POST /api/telegram/account` — return linked state, wallet balance, readiness, and current Polymarket/scenario assessment prices; never return an API key or user ID.
- `POST /api/telegram/usage` — return up to ten recent Telegram assessment charges for the linked account; never return user IDs, API keys, or unrelated ledger entries.
- `POST /api/telegram/assessment` — assess one strictly validated Polymarket request, sign it, then charge the user's wallet idempotently.
- `POST /api/telegram/scenario-assessment` — assess a strict Base lending, Hyperliquid perp, or reviewed Base Aerodrome DEX request, sign a canonical read-only report, then charge the user's wallet idempotently.
- `POST /api/telegram/assessment/refund` — compensate an idempotent assessment charge when the worker cannot verify or deliver the signed report.

`POST /api/telegram/link/claim` instead requires a normal authenticated Insight user session and an explicit confirmation from the account-link page.

Apply migrations `0151_telegram_account_linking.sql`, `0152_telegram_wallet_billing.sql`, and `20261128124037_telegram_readonly_scenarios.sql` before enabling `TELEGRAM_INTEGRATION_SECRET` in the Worker. Do not publish the Worker secret as a Wrangler variable or add it to browser settings.

## Assessment billing behavior

The Polymarket and scenario signed assessments use Insight's published endpoint price. The API performs a credit precheck before assessment work and commits the debit only after it has a signed decision. Ledger reasons are scene-specific. Insufficient balance returns no assessment. Upstream failure, timeout, or missing attester returns no assessment and makes no debit. The Telegram callback path supplies Telegram's update ID so webhook retries use the same ledger idempotency key. If signature verification or Telegram report delivery fails after a charge, the worker calls the idempotent compensation route.

The unlinked first sample uses the bot's configured Insight API key, a lifetime cap of one successful sample per private Telegram account, and a global ceiling of 200 credits per UTC calendar month enforced atomically by a shared Durable Object. At the current 20-credit price, this allows at most ten sponsored samples per month; dynamic price changes lower or raise the number of available samples while never exceeding the credit ceiling. Sponsorship is restricted to the configured private beta allowlist and is disabled for wildcard/public access. The ceiling fails closed if Insight cannot provide current pricing or the shared budget is unavailable. A failed assessment or failed Telegram delivery releases the pending trial reservation so the user can retry. After the sample, the bot requires account linking to continue.

## Four scenario gates

| Scenario          | Status           | Required before enablement                                                                                                                                                                                      |
| ----------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Polymarket        | Controlled pilot | Guided direction buttons, fresh market selection, 120-second quote/review window plus latency-derived reserve, live price-drift recheck, user-linked credits after the sample, PriorSeal signature verification |
| Base lending      | Assessment-only  | Aave V3 Base; caller-declared what-if values plus live on-chain risk parameters; no wallet/position/price-integrity/depeg check, calldata, or transaction envelope                                              |
| Hyperliquid perps | Assessment-only  | BTC/ETH, caller-declared direction/size/margin with Hyperliquid-only venue context; no cross-venue consensus, account positions, IOC fields, or order envelope                                                  |
| DEX swap          | Assessment-only  | Two reviewed Base Aerodrome Slipstream pairs; chain quote/TWAP evidence; no recipient/calldata; always `CAUTION`                                                                                                |

Every result is an assessment. `ALLOW` never authorizes execution. If its required source, billing, signature, or account service is unavailable, that request fails closed and returns no assessment. DEX `CAUTION` is an informational quote report, not a slippage guarantee.
