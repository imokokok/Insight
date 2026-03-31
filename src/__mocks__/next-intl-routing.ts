export const defineRouting = <T extends Record<string, unknown>>(config: T): T => config;
export const createNavigation = <T extends Record<string, unknown>>(config: T) => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  redirect: (path: string) => path,
  usePathname: () => '/',
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    refresh: () => {},
  }),
});

export const locales = ['en', 'zh-CN'];
export const defaultLocale = 'en';

export default {
  defineRouting,
  createNavigation,
  locales,
  defaultLocale,
};
