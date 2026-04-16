import { type Pathnames } from 'next-intl/routing';

export const locales = ['en', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const pathnames: Pathnames<typeof locales> = {
  '/': '/',
};

export const localePrefix = 'always';

export interface MessageFileConfig {
  name: string;
  directory?: string;
  namespace?: string;
}

export const messageFilesConfig: MessageFileConfig[] = [
  { name: 'common' },
  { name: 'navigation' },
  { name: 'home' },
  { name: 'ui' },
  { name: 'priceQuery' },
  { name: 'comparison' },
  { name: 'crossOracle' },
  { name: 'crossChain' },
  { name: 'dataQuality' },
  { name: 'dataTransparency' },
  { name: 'charts', directory: 'components' },
  { name: 'alerts', directory: 'components', namespace: 'alerts' },
  { name: 'export', directory: 'components', namespace: 'export' },
  { name: 'favorites', directory: 'components', namespace: 'favorites' },
  { name: 'search', directory: 'components' },
  { name: 'settings', directory: 'features', namespace: 'settings' },
  { name: 'auth', directory: 'features', namespace: 'auth' },
  { name: 'methodology', directory: 'features' },
  { name: 'docs', namespace: 'docs' },
];
