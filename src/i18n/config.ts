import { Pathnames } from 'next-intl/routing';

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
  { name: 'marketOverview' },
  { name: 'priceQuery' },
  { name: 'comparison' },
  { name: 'crossOracle' },
  { name: 'crossChain' },
  { name: 'dataQuality' },
  { name: 'dataTransparency' },
  { name: 'chainlink', directory: 'oracles' },
  { name: 'pyth', directory: 'oracles' },
  { name: 'api3', directory: 'oracles' },
  { name: 'band', directory: 'oracles' },
  { name: 'tellor', directory: 'oracles' },
  { name: 'uma', directory: 'oracles' },
  { name: 'dia', directory: 'oracles' },
  { name: 'redstone', directory: 'oracles' },
  { name: 'chronicle', directory: 'oracles' },
  { name: 'winklink', directory: 'oracles' },
  { name: 'charts', directory: 'components' },
  { name: 'alerts', directory: 'components' },
  { name: 'export', directory: 'components', namespace: 'unifiedExport' },
  { name: 'favorites', directory: 'components' },
  { name: 'search', directory: 'components' },
  { name: 'settings', directory: 'features' },
  { name: 'auth', directory: 'features' },
  { name: 'methodology', directory: 'features' },
];
