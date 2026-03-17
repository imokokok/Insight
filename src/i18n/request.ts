import { getRequestConfig } from 'next-intl/server';
import { routing, getValidLocale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // 从请求中获取 locale
  const requestedLocale = await requestLocale;

  // 使用 getValidLocale 处理：中文显示中文，其他都显示英文
  const locale = getValidLocale(requestedLocale);

  return {
    locale,
    messages: (await import(`./${locale}.json`)).default,
  };
});
