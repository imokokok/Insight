import { type NextResponse } from 'next/server';

import { API_VERSIONS, VERSION_HEADERS, type ApiVersion } from './constants';

export function withVersionHeaders(
  response: NextResponse,
  version: ApiVersion = API_VERSIONS.CURRENT
): NextResponse {
  response.headers.set(VERSION_HEADERS.API_VERSION, version);
  return response;
}
