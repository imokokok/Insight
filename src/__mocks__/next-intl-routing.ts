export const defineRouting = (config: any) => config;
export const createNavigation = (config: any) => ({
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
