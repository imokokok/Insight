export const getTranslations = () => Promise.resolve((key: string) => key);
export const getLocale = () => Promise.resolve('en');
export const getMessages = () => Promise.resolve({});
export const getTimeZone = () => Promise.resolve('UTC');
export const getNow = () => Promise.resolve(new Date());
export const getFormatter = () =>
  Promise.resolve({
    dateTime: () => '',
    number: () => '',
    relativeTime: () => '',
    list: () => '',
  });

export default {
  getTranslations,
  getLocale,
  getMessages,
  getTimeZone,
  getNow,
  getFormatter,
};
