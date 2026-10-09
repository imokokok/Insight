-- Record which pay-per-call protocol produced each lifecycle event. Existing
-- records are x402 because MPP was introduced as an additional REST rail.
-- Apply this migration before deploying code that selects or writes protocol.

alter table public.x402_settlements
  add column if not exists protocol text not null default 'x402'
    check (protocol in ('x402', 'mpp'));

create index if not exists idx_x402_settlements_protocol_created_at
  on public.x402_settlements (protocol, created_at desc);

comment on column public.x402_settlements.protocol is
  'Payment protocol used for this lifecycle event: x402 or MPP.';
