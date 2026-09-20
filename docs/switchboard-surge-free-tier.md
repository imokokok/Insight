# Switchboard free-tier integration

Insight uses Switchboard's free access in two deliberately separate paths.

## Signed realtime path: BTC and ETH

The persistent worker subscribes to exactly `BTC/USD` and `ETH/USD`, matching
the free Surge Plug limit of two feeds and one connection. Every incoming bundle
is verified locally against its Ed25519 enclave signer before it is written to
`price_records` with source `switchboard-surge-signed`. The full signature,
checksum, signer, feed hash, raw value, slot, and source timestamp are retained
in the JSON verification evidence.

Prerequisites:

1. Initialize an active Surge subscription for a Solana wallet. Selecting the
   free tier still requires this on-chain subscription setup.
2. Set `SWITCHBOARD_SOLANA_SECRET_KEY` and the existing Supabase service-role
   environment variables.
3. Run the stream on a persistent process host, not a request-based serverless
   function:

   ```bash
   npm run stream:switchboard
   ```

`SWITCHBOARD_SOLANA_RPC_URL` and `SWITCHBOARD_SURGE_GATEWAY_URL` are optional.
The worker otherwise uses Solana mainnet RPC and Crossbar gateway discovery.
It reconnects with bounded exponential backoff when the upstream gateway is
temporarily unavailable.

## Other project feeds: unsigned simulation

The feed-discovery job intersects the public Surge catalogue with symbols
already tracked by Insight and probes each candidate through `/v2/simulate`.
Only candidates returning a finite positive price are activated. This adds
useful project coverage beyond the old static Switchboard list without trying
to ingest thousands of unrelated catalogue entries.

Simulation responses contain no oracle signature or provider timestamp. They
are therefore stored and returned as `switchboard-simulation`, with
`verificationLevel: unsigned`, `countsTowardOracleQuorum: false`, and reduced
confidence. They may be displayed or used diagnostically, but cannot increase
the consensus participant count, satisfy an independence gate, or become the
recommended provider.

Run `npm run build:cron` after discovery changes so the committed sync bundle
matches the TypeScript source.
