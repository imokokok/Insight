import type {
  IntlMessages as GeneratedIntlMessages,
  TranslationKey as GeneratedTranslationKey,
} from './src/i18n/generated-types';

export type { GeneratedIntlMessages as IntlMessages, GeneratedTranslationKey as TranslationKey };

declare global {
  type IntlMessages = GeneratedIntlMessages;
  type TranslationKey = GeneratedTranslationKey;
}
