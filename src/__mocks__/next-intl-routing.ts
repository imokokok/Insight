export const defineRouting = <T extends Record<string, unknown>>(_config: T): T => _config;
export const createNavigation = <T extends Record<string, unknown>>(_config: T) => ({
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

const nextIntlRouting = {
  defineRouting,
  createNavigation,
  locales,
  defaultLocale,
};

export default nextIntlRouting;
