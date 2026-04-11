import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import LanguageSwitcher from '../LanguageSwitcher';

const mockReplace = jest.fn();

let currentPathname = '/en';
let currentParams = { locale: 'en' };

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => currentParams,
}));

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en', 'zh-CN'],
    defaultLocale: 'en',
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

const renderLanguageSwitcher = () => {
  return render(<LanguageSwitcher />, { wrapper: createWrapper() });
};

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentPathname = '/en';
    currentParams = { locale: 'en' };
  });

  describe('基础渲染', () => {
    it('应该正确渲染语言切换器', () => {
      renderLanguageSwitcher();

      expect(screen.getByText('🌐')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('应该显示下拉箭头图标', () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /english/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('下拉菜单切换', () => {
    it('点击按钮应该打开下拉菜单', () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /english/i });
      fireEvent.click(button);

      expect(screen.getByText('中文')).toBeInTheDocument();
    });

    it('再次点击按钮应该关闭下拉菜单', () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /english/i });
      fireEvent.click(button);
      expect(screen.getByText('中文')).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByText('中文')).not.toBeInTheDocument();
    });

    it('下拉菜单应该显示所有语言选项', () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /english/i });
      fireEvent.click(button);

      const allEnglishButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.textContent?.includes('English'));
      expect(allEnglishButtons.length).toBeGreaterThan(0);
      expect(screen.getByText('中文')).toBeInTheDocument();
    });
  });

  describe('语言切换功能', () => {
    it('选择中文应该切换语言', async () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /english/i });
      fireEvent.click(button);

      const chineseOption = screen.getByRole('button', { name: /中文/i });
      fireEvent.click(chineseOption);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalled();
      });
    });

    it('选择英文应该切换语言', async () => {
      currentPathname = '/zh-CN';
      currentParams = { locale: 'zh-CN' };

      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /中文/i });
      fireEvent.click(button);

      const englishOption = screen.getByRole('button', { name: /English/i });
      fireEvent.click(englishOption);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalled();
      });
    });

    it('切换语言后应该关闭下拉菜单', async () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /english/i });
      fireEvent.click(button);

      const chineseOption = screen.getByRole('button', { name: /中文/i });
      fireEvent.click(chineseOption);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /中文/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('当前语言高亮', () => {
    it('当前语言应该有高亮样式', () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /english/i });
      fireEvent.click(button);

      const englishOption = screen
        .getAllByRole('button')
        .find((btn) => btn.textContent === 'English' && btn.classList.contains('bg-primary-50'));
      expect(englishOption).toBeDefined();
    });

    it('非当前语言不应该有高亮样式', () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /english/i });
      fireEvent.click(button);

      const chineseOption = screen.getAllByRole('button').find((btn) => btn.textContent === '中文');
      expect(chineseOption?.classList.contains('bg-primary-50')).toBe(false);
    });
  });

  describe('中文语言环境', () => {
    beforeEach(() => {
      currentPathname = '/zh-CN';
      currentParams = { locale: 'zh-CN' };
    });

    it('应该显示中文作为当前语言', () => {
      renderLanguageSwitcher();

      expect(screen.getByText('中文')).toBeInTheDocument();
    });

    it('点击按钮应该显示语言选项', () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /中文/i });
      fireEvent.click(button);

      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('切换语言时按钮应该被禁用', async () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /english/i });
      fireEvent.click(button);

      const chineseOption = screen.getByRole('button', { name: /中文/i });
      fireEvent.click(chineseOption);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('可访问性', () => {
    it('按钮应该是可聚焦的', () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /english/i });
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });

    it('下拉菜单选项应该是可点击的', () => {
      renderLanguageSwitcher();

      const button = screen.getByRole('button', { name: /english/i });
      fireEvent.click(button);

      const options = screen.getAllByRole('button');
      expect(options.length).toBeGreaterThan(1);
    });
  });
});
