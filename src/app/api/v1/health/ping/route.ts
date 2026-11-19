import { NextResponse } from 'next/server';

// Ultra-light liveness probe for the HTTP plane.
//
// CONSTRAINT: this file MUST NOT import anything beyond next/server. Vercel
// builds per-route function bundles, so every import here grows the cold
// start CPU of this route. This endpoint is hit every 5 minutes by
// insight-cf-sentinel (288+ calls/day); a zero-dependency bundle keeps that
// probe's Fluid CPU cost near zero. Deep dependency checks live on
// /api/v1/health/ready (?deep=1, authenticated) and are invoked by
// turso-control-plane-alert at low frequency.
//
// History: the sentinel previously probed /api/v1/health/ready, whose
// Supabase/Turso/schema-check import chain cold-started a heavy bundle
// 288 times/day and consumed ~189% of the Fluid Active CPU free allowance
// (2026-11-19). Do not "re-unify" this route into shared handler
// middleware — that reintroduces the billing/DB import chain and the
// original burn.

export function GET(): NextResponse {
  return NextResponse.json(
    { status: 'live', timestamp: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
