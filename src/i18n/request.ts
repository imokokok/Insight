import { getRequestConfig } from 'next-intl/server';
import { getValidLocale } from './routing';
import type { Locale } from './config';

async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  const messages: Record<string, unknown> = {};

  // Load common first
  try {
    const common = (
      await import(`./messages/${locale}/common.json`)
    ).default;
    Object.assign(messages, common);
  } catch {
    // ignore
  }

  // Load navigation
  try {
    const navigation = (
      await import(`./messages/${locale}/navigation.json`)
    ).default;
    Object.assign(messages, navigation);
  } catch {
    // ignore
  }

  // Load home
  try {
    const home = (
      await import(`./messages/${locale}/home.json`)
    ).default;
    Object.assign(messages, home);
  } catch {
    // ignore
  }

  // Load ui
  try {
    const ui = (
      await import(`./messages/${locale}/ui.json`)
    ).default;
    Object.assign(messages, ui);
  } catch {
    // ignore
  }

  // Load marketOverview
  try {
    const marketOverview = (
      await import(`./messages/${locale}/marketOverview.json`)
    ).default;
    Object.assign(messages, marketOverview);
  } catch {
    // ignore
  }

  // Load priceQuery
  try {
    const priceQuery = (
      await import(`./messages/${locale}/priceQuery.json`)
    ).default;
    Object.assign(messages, priceQuery);
  } catch {
    // ignore
  }

  // Load comparison
  try {
    const comparison = (
      await import(`./messages/${locale}/comparison.json`)
    ).default;
    Object.assign(messages, comparison);
  } catch {
    // ignore
  }

  // Load crossOracle
  try {
    const crossOracle = (
      await import(`./messages/${locale}/crossOracle.json`)
    ).default;
    Object.assign(messages, crossOracle);
  } catch {
    // ignore
  }

  // Load crossChain
  try {
    const crossChain = (
      await import(`./messages/${locale}/crossChain.json`)
    ).default;
    Object.assign(messages, crossChain);
  } catch {
    // ignore
  }

  // Load dataQuality
  try {
    const dataQuality = (
      await import(`./messages/${locale}/dataQuality.json`)
    ).default;
    Object.assign(messages, dataQuality);
  } catch {
    // ignore
  }

  // Load dataTransparency
  try {
    const dataTransparency = (
      await import(`./messages/${locale}/dataTransparency.json`)
    ).default;
    Object.assign(messages, dataTransparency);
  } catch {
    // ignore
  }

  // Load oracle files
  const oracles = [
    'chainlink',
    'pyth',
    'api3',
    'band',
    'tellor',
    'uma',
    'dia',
    'redstone',
    'chronicle',
    'winklink',
  ];

  for (const oracle of oracles) {
    try {
      const oracleMessages = (
        await import(`./messages/${locale}/oracles/${oracle}.json`)
      ).default;
      Object.assign(messages, oracleMessages);
    } catch {
      // ignore
    }
  }

  // Load component files
  const components = ['charts', 'alerts', 'favorites', 'search'];
  for (const component of components) {
    try {
      const componentMessages = (
        await import(`./messages/${locale}/components/${component}.json`)
      ).default;
      Object.assign(messages, componentMessages);
    } catch {
      // ignore
    }
  }

  // Load export with namespace
  try {
    const exportMessages = (
      await import(`./messages/${locale}/components/export.json`)
    ).default;
    messages.unifiedExport = exportMessages;
  } catch {
    // ignore
  }

  // Load feature files
  const features = ['settings', 'auth', 'methodology'];
  for (const feature of features) {
    try {
      const featureMessages = (
        await import(`./messages/${locale}/features/${feature}.json`)
      ).default;
      Object.assign(messages, featureMessages);
    } catch {
      // ignore
    }
  }

  return messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = getValidLocale(requestedLocale);
  const messages = await loadMessages(locale);

  return {
    locale,
    messages,
  };
});
