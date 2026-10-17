-- Allow x402 settlement audit rows for Monad (eip155:143) and BNB Smart
-- Chain (eip155:56). 0089 shipped before Monad joined X402_EVM_NETWORK_IDS,
-- so Monad settlement rows have been violating x402_settlements_network_check
-- and dropping on insert (logged as "x402 settlement audit insert failed").
-- CAIP-2 remains the canonical network value stored by x402 v2.

alter table public.x402_settlements
  drop constraint if exists x402_settlements_network_check;

alter table public.x402_settlements
  add constraint x402_settlements_network_check
  check (
    network is null
    or network in (
      'eip155:84532',
      'eip155:8453',
      'eip155:1',
      'eip155:10',
      'eip155:42161',
      'eip155:137',
      'eip155:43114',
      'eip155:1329',
      'eip155:196',
      'eip155:143',
      'eip155:56',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
    )
  );
