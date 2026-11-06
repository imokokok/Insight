-- The bounded acquisition vocabulary lives in
-- src/lib/api/x402/guard.ts (X402_ACQUISITION_SOURCES, ten labels).
-- Migration 0105 installed a six-value CHECK, which silently rejected the four
-- agent-native labels used by Skill packages, wallet MCP runtimes, and
-- Solana/agent directories. Widen both CHECK constraints to the full allowlist.
-- No column, default, or index changes. The label stays non-identifying and
-- never affects authorization, pricing, payment verification, or settlement.

begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

alter table public.x402_settlements
  drop constraint if exists x402_settlements_acquisition_source_check;

alter table public.x402_settlements
  add constraint x402_settlements_acquisition_source_check
  check (acquisition_source in (
    'direct', 'docs', 'bazaar', 'mcp', 'sdk', 'skill',
    'wallet_mcp', 'sendaifun', 'solana_directory', 'unknown'
  ));

alter table public.trade_journeys
  drop constraint if exists trade_journeys_acquisition_source_check;

alter table public.trade_journeys
  add constraint trade_journeys_acquisition_source_check
  check (acquisition_source in (
    'direct', 'docs', 'bazaar', 'mcp', 'sdk', 'skill',
    'wallet_mcp', 'sendaifun', 'solana_directory', 'unknown'
  ));

commit;
