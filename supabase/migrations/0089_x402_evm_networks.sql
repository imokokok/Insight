-- Allow x402 settlement audit rows for the configured native-USDC EVM networks.
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
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
    )
  );
