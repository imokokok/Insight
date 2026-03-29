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
  { name: 'ui', namespace: 'ui' },
  { name: 'marketOverview', namespace: 'marketOverview' },
  { name: 'priceQuery' },
  { name: 'comparison' },
  { name: 'crossOracle' },
  { name: 'crossChain' },
  { name: 'dataQuality' },
  { name: 'dataTransparency' },
  { name: 'chainlink', directory: 'oracles', namespace: 'chainlink' },
  { name: 'pyth', directory: 'oracles', namespace: 'pyth' },
  { name: 'api3', directory: 'oracles', namespace: 'api3' },
  { name: 'band', directory: 'oracles', namespace: 'band' },
  { name: 'tellor', directory: 'oracles', namespace: 'tellor' },
  { name: 'uma', directory: 'oracles', namespace: 'uma' },
  { name: 'dia', directory: 'oracles', namespace: 'dia' },
  { name: 'redstone', directory: 'oracles', namespace: 'redstone' },
  { name: 'chronicle', directory: 'oracles', namespace: 'chronicle' },
  { name: 'winklink', directory: 'oracles', namespace: 'winklink' },
  { name: 'charts', directory: 'components' },
  { name: 'alerts', directory: 'components' },
  { name: 'export', directory: 'components', namespace: 'export' },
  { name: 'favorites', directory: 'components' },
  { name: 'search', directory: 'components' },
  { name: 'settings', directory: 'features' },
  { name: 'auth', directory: 'features' },
  { name: 'methodology', directory: 'features' },
];
