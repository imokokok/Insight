import { getRequestConfig } from 'next-intl/server';
import { getValidLocale } from './routing';
import type { Locale } from './config';

// 动态加载翻译文件的辅助函数
async function loadMessages(locale: Locale) {
  const messages: Record<string, unknown> = {};

  try {
    // 核心模块 - 始终加载
    const common = await import(`./messages/${locale}/common.json`);
    Object.assign(messages, common.default || common);
  } catch {
    // 如果新结构不存在，回退到旧文件
    const fallback = await import(`./${locale}.json`);
    return fallback.default || fallback;
  }

  try {
    const navigation = await import(`./messages/${locale}/navigation.json`);
    Object.assign(messages, navigation.default || navigation);
  } catch { /* 可选模块 */ }

  try {
    const home = await import(`./messages/${locale}/home.json`);
    Object.assign(messages, home.default || home);
  } catch { /* 可选模块 */ }

  try {
    const ui = await import(`./messages/${locale}/ui.json`);
    Object.assign(messages, ui.default || ui);
  } catch { /* 可选模块 */ }

  try {
    const marketOverview = await import(`./messages/${locale}/marketOverview.json`);
    Object.assign(messages, marketOverview.default || marketOverview);
  } catch { /* 可选模块 */ }

  try {
    const priceQuery = await import(`./messages/${locale}/priceQuery.json`);
    Object.assign(messages, priceQuery.default || priceQuery);
  } catch { /* 可选模块 */ }

  try {
    const comparison = await import(`./messages/${locale}/comparison.json`);
    Object.assign(messages, comparison.default || comparison);
  } catch { /* 可选模块 */ }

  try {
    const crossOracle = await import(`./messages/${locale}/crossOracle.json`);
    Object.assign(messages, crossOracle.default || crossOracle);
  } catch { /* 可选模块 */ }

  try {
    const crossChain = await import(`./messages/${locale}/crossChain.json`);
    Object.assign(messages, crossChain.default || crossChain);
  } catch { /* 可选模块 */ }

  try {
    const dataQuality = await import(`./messages/${locale}/dataQuality.json`);
    Object.assign(messages, dataQuality.default || dataQuality);
  } catch { /* 可选模块 */ }

  try {
    const dataTransparency = await import(`./messages/${locale}/dataTransparency.json`);
    Object.assign(messages, dataTransparency.default || dataTransparency);
  } catch { /* 可选模块 */ }

  // 加载 oracles 目录下的所有文件
  const oracleFiles = [
    'chainlink', 'pyth', 'api3', 'band', 'tellor', 'uma', 'dia', 'redstone', 'chronicle', 'winklink'
  ];

  for (const oracle of oracleFiles) {
    try {
      const oracleMessages = await import(`./messages/${locale}/oracles/${oracle}.json`);
      Object.assign(messages, oracleMessages.default || oracleMessages);
    } catch { /* 可选模块 */ }
  }

  // 加载 components 目录下的文件
  const componentFiles = ['charts', 'alerts', 'export', 'favorites', 'search'];
  for (const component of componentFiles) {
    try {
      const componentMessages = await import(`./messages/${locale}/components/${component}.json`);
      // export.json 使用 unifiedExport 作为命名空间
      if (component === 'export') {
        messages.unifiedExport = componentMessages.default || componentMessages;
      } else {
        Object.assign(messages, componentMessages.default || componentMessages);
      }
    } catch { /* 可选模块 */ }
  }

  // 加载 features 目录下的文件
  const featureFiles = ['settings', 'auth', 'methodology'];
  for (const feature of featureFiles) {
    try {
      const featureMessages = await import(`./messages/${locale}/features/${feature}.json`);
      Object.assign(messages, featureMessages.default || featureMessages);
    } catch { /* 可选模块 */ }
  }

  return messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  // 从请求中获取 locale
  const requestedLocale = await requestLocale;

  // 使用 getValidLocale 处理：中文显示中文，其他都显示英文
  const locale = getValidLocale(requestedLocale);

  // 动态加载翻译文件
  const messages = await loadMessages(locale);

  return {
    locale,
    messages,
  };
});
