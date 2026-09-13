import { NextResponse } from 'next/server';

import vector from '@/../scripts/veritas-joint-run/provider-observation-hash-vector-v1.json';

export function GET() {
  return NextResponse.json(vector, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    },
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
