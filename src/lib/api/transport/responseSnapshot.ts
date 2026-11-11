import { NextResponse } from 'next/server';

/**
 * Read a response body while preserving a deliverable response for callers.
 *
 * Edge/runtime implementations normally provide Response.clone(), while some
 * test and polyfill environments do not. The fallback rebuilds an equivalent
 * response after consuming its body.
 */
export async function snapshotResponse(
  response: NextResponse
): Promise<{ body: string; response: NextResponse }> {
  if (typeof (response as Response).clone === 'function') {
    return { body: await response.clone().text(), response };
  }

  const body = await response.text();
  return {
    body,
    response: new NextResponse(body, { status: response.status, headers: response.headers }),
  };
}
