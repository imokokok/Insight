export const useTranslations = () => (key: string) => key;
export const useLocale = () => 'en';
export const useMessages = () => ({});
export const useTimeZone = () => 'UTC';
export const useNow = () => new Date();
export const useFormatter = () => ({
  dateTime: () => '',
  number: () => '',
  relativeTime: () => '',
  list: () => '',
});

export default {
  useTranslations,
  useLocale,
  useMessages,
  useTimeZone,
  useNow,
  useFormatter,
};
