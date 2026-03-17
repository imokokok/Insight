import { NextRequest, NextResponse } from 'next/server';
import {
  API_VERSIONS,
  DEPRECATED_VERSIONS,
  VERSION_DEPRECATION_DATES,
  VERSION_HEADERS,
  ApiVersion,
  VersionInfo,
} from './constants';

export interface VersionMiddlewareOptions {
  defaultVersion?: ApiVersion;
  includeVersionHeader?: boolean;
  onDeprecated?: (version: string, info: VersionInfo) => void;
}

export function createVersionMiddleware(options: VersionMiddlewareOptions = {}) {
  const { defaultVersion = API_VERSIONS.CURRENT, onDeprecated } = options;

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
    const apiIndex = pathParts.findIndex((part) => part === 'api');

    let requestedVersion: string | undefined;
    if (apiIndex !== -1 && pathParts[apiIndex + 1]?.startsWith('v')) {
      requestedVersion = pathParts[apiIndex + 1];
    }

    const version = requestedVersion || defaultVersion;

    if (DEPRECATED_VERSIONS.has(version)) {
      const deprecationDate = VERSION_DEPRECATION_DATES[version];
      const sunsetDate = deprecationDate
        ? new Date(deprecationDate.getTime() + 180 * 24 * 60 * 60 * 1000)
        : undefined;

      if (onDeprecated) {
        onDeprecated(version, {
          version: version as ApiVersion,
          isDeprecated: true,
          deprecationDate,
          sunsetDate,
        });
      }
    }

    return null;
  };
}

export function addVersionHeaders(
  response: NextResponse,
  version: ApiVersion,
  isDeprecated: boolean = false,
  deprecationDate?: Date,
  sunsetDate?: Date
): NextResponse {
  response.headers.set(VERSION_HEADERS.API_VERSION, version);

  if (isDeprecated) {
    response.headers.set(VERSION_HEADERS.DEPRECATED, 'true');

    if (deprecationDate) {
      response.headers.set(VERSION_HEADERS.DEPRECATION_DATE, deprecationDate.toISOString());
    }

    if (sunsetDate) {
      response.headers.set(VERSION_HEADERS.SUNSET_DATE, sunsetDate.toISOString());
      const migrationUrl = `/api/${API_VERSIONS.CURRENT}`;
      response.headers.set(VERSION_HEADERS.LINK, `<${migrationUrl}>; rel="successor-version"`);
    }
  }

  return response;
}

export function withVersionHeaders(
  response: NextResponse,
  version: ApiVersion = API_VERSIONS.CURRENT
): NextResponse {
  const isDeprecated = DEPRECATED_VERSIONS.has(version);
  const deprecationDate = VERSION_DEPRECATION_DATES[version];
  const sunsetDate = deprecationDate
    ? new Date(deprecationDate.getTime() + 180 * 24 * 60 * 60 * 1000)
    : undefined;

  return addVersionHeaders(response, version, isDeprecated, deprecationDate, sunsetDate);
}
