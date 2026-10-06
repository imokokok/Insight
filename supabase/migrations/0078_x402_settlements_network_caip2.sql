-- Fix the x402 settlement audit network check to match the CAIP-2 network ids
-- that x402 v2 actually carries on the wire.
--
-- 0077 declared `network in ('base', 'base-sepolia')`, but the code
-- (src/lib/api/x402/config.ts) validates X402_NETWORK against the CAIP-2 ids
-- 'eip155:84532' (Base Sepolia) and 'eip155:8453' (Base mainnet) — those are
-- what the x402 v2 wire format uses. Every audit insert therefore violated
-- x402_settlements_network_check and was silently dropped (the insert is
-- best-effort by design), so the table never captured a single settlement,
-- including the first real paid ones. No rows exist under the legacy names,
-- so no backfill is needed.

alter table public.x402_settlements
  drop constraint x402_settlements_network_check;

alter table public.x402_settlements
  add constraint x402_settlements_network_check
  check (network in ('eip155:84532', 'eip155:8453'));
