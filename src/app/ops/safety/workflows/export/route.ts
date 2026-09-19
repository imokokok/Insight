import { type NextRequest, NextResponse } from 'next/server';

import { getWorkflowQualityReport, WorkflowFilters } from '@/lib/ops/workflowQuality';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const input = Object.fromEntries(
    [...request.nextUrl.searchParams].filter(([, value]) => value !== '')
  );
  const parsed = WorkflowFilters.safeParse(input);
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid workflow filters' }, { status: 400 });
  // getWorkflowQualityReport repeats the owner session gate: route handlers do
  // not inherit the /ops layout's authorization.
  const report = await getWorkflowQualityReport(parsed.data);
  return NextResponse.json(report, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="insight-workflow-quality.json"',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
