export const API_VERSIONS = {
  V1: 'v1',
  CURRENT: 'v1',
} as const;

export type ApiVersion = (typeof API_VERSIONS)[keyof typeof API_VERSIONS];

export const VERSION_HEADERS = {
  API_VERSION: 'X-API-Version',
  DEPRECATED: 'X-API-Deprecated',
  DEPRECATION_DATE: 'X-API-Deprecation-Date',
  SUNSET_DATE: 'X-API-Sunset-Date',
  LINK: 'Link',
} as const;
