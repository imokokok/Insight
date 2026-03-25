import { getRequestConfig } from 'next-intl/server';
import { getValidLocale } from './routing';
import { messageFilesConfig } from './config';
import type { Locale } from './config';

async function loadMessageFile(
  locale: string,
  fileName: string,
  directory?: string
): Promise<Record<string, unknown> | null> {
  const path = directory ? `${directory}/${fileName}` : fileName;
  try {
    const module = await import(`./messages/${locale}/${path}.json`);
    return module.default;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Failed to load messages: ${locale}/${path}.json`, error);
    }
    return null;
  }
}

async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  const messages: Record<string, unknown> = {};

  for (const config of messageFilesConfig) {
    const fileMessages = await loadMessageFile(locale, config.name, config.directory);
    if (fileMessages) {
      Object.assign(messages, fileMessages);
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
