export const API_VERSIONS = {
  V1: 'v1',
  CURRENT: 'v1',
} as const;

export type ApiVersion = (typeof API_VERSIONS)[keyof typeof API_VERSIONS];

export const DEPRECATED_VERSIONS: Set<string> = new Set();

export const VERSION_DEPRECATION_DATES: Record<string, Date> = {};

export const VERSION_HEADERS = {
  API_VERSION: 'X-API-Version',
  DEPRECATED: 'X-API-Deprecated',
  DEPRECATION_DATE: 'X-API-Deprecation-Date',
  SUNSET_DATE: 'X-API-Sunset-Date',
  LINK: 'Link',
} as const;

export interface VersionInfo {
  version: ApiVersion;
  isDeprecated: boolean;
  deprecationDate?: Date;
  sunsetDate?: Date;
  migrationGuide?: string;
}

export function getVersionInfo(version: string): VersionInfo {
  return {
    version: version as ApiVersion,
    isDeprecated: DEPRECATED_VERSIONS.has(version),
    deprecationDate: VERSION_DEPRECATION_DATES[version],
  };
}

export function isVersionSupported(version: string): boolean {
  return Object.values(API_VERSIONS).includes(version as ApiVersion);
}
