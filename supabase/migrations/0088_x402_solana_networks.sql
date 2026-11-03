-- Add Solana x402 V2 networks to the internal lifecycle audit while retaining
-- Base CAIP-2 identifiers. A null network marks a quote or rejected payment
-- for which no single accepted payment option was verified.

alter table public.x402_settlements
  alter column network drop not null;

alter table public.x402_settlements
  drop constraint if exists x402_settlements_network_check;

alter table public.x402_settlements
  add constraint x402_settlements_network_check
  check (
    network is null
    or network in (
      'eip155:84532',
      'eip155:8453',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
    )
  );

comment on column public.x402_settlements.network is
  'CAIP-2 network selected for a verified payment; null when a multi-network quote or rejected payload has no validated selection.';
