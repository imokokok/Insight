-- Keep conversion analysis private and deliberately non-identifying. The
-- bounded source label is client-declared operational metadata only; it must
-- never affect authorization, pricing, payment verification, or settlement.

begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

alter table public.x402_settlements
  add column if not exists acquisition_source text not null default 'unknown';

alter table public.x402_settlements
  drop constraint if exists x402_settlements_acquisition_source_check;

alter table public.x402_settlements
  add constraint x402_settlements_acquisition_source_check
  check (acquisition_source in ('direct', 'docs', 'bazaar', 'mcp', 'sdk', 'unknown'));

alter table public.trade_journeys
  add column if not exists acquisition_source text not null default 'unknown';

alter table public.trade_journeys
  drop constraint if exists trade_journeys_acquisition_source_check;

alter table public.trade_journeys
  add constraint trade_journeys_acquisition_source_check
  check (acquisition_source in ('direct', 'docs', 'bazaar', 'mcp', 'sdk', 'unknown'));

create index if not exists idx_x402_settlements_acquisition_source_created_at
  on public.x402_settlements (acquisition_source, created_at desc);

create index if not exists idx_trade_journeys_acquisition_source_created_at
  on public.trade_journeys (acquisition_source, created_at desc);

comment on column public.x402_settlements.acquisition_source is
  'Bounded optional entry label for aggregate conversion analysis. Not an identity and not a payment or authorization input.';

comment on column public.trade_journeys.acquisition_source is
  'Bounded optional entry label inherited from a paid pre-trade request for aggregate conversion analysis only.';

commit;
