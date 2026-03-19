import { Pathnames } from 'next-intl/routing';

export const locales = ['en', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const pathnames: Pathnames<typeof locales> = {
  '/': '/',
};

export const localePrefix = 'always';

// 翻译文件命名空间配置
export const messageNamespaces = [
  'common',
  'navigation',
  'home',
  'ui',
  'marketOverview',
  'priceQuery',
  'crossOracle',
  'crossChain',
  'oracles',
  'components',
  'features',
] as const;

export type MessageNamespace = (typeof messageNamespaces)[number];

// 按需加载配置 - 根据路由匹配加载对应的翻译文件
export const namespaceRouteMap: Record<string, MessageNamespace[]> = {
  default: ['common', 'navigation', 'ui'],
  '/': ['common', 'navigation', 'home', 'ui'],
  '/market-overview': ['common', 'navigation', 'marketOverview', 'ui'],
  '/price-query': ['common', 'navigation', 'priceQuery', 'ui'],
  '/cross-oracle': ['common', 'navigation', 'crossOracle', 'ui'],
  '/cross-chain': ['common', 'navigation', 'crossChain', 'ui'],
  '/chainlink': ['common', 'navigation', 'oracles', 'ui'],
  '/pyth-network': ['common', 'navigation', 'oracles', 'ui'],
  '/api3': ['common', 'navigation', 'oracles', 'ui'],
  '/band-protocol': ['common', 'navigation', 'oracles', 'ui'],
  '/tellor': ['common', 'navigation', 'oracles', 'ui'],
  '/uma': ['common', 'navigation', 'oracles', 'ui'],
  '/dia': ['common', 'navigation', 'oracles', 'ui'],
  '/redstone': ['common', 'navigation', 'oracles', 'ui'],
  '/chronicle': ['common', 'navigation', 'oracles', 'ui'],
  '/winklink': ['common', 'navigation', 'oracles', 'ui'],
  '/settings': ['common', 'navigation', 'features', 'ui'],
  '/alerts': ['common', 'navigation', 'components', 'ui'],
  '/favorites': ['common', 'navigation', 'components', 'ui'],
};
