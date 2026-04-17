import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import ProfessionalHero from '../ProfessionalHero';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/en',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: 'en' }),
}));

jest.mock('../HeroBackground', () => ({
  __esModule: true,
  default: ({
    enableParticles,
    enableDataFlow,
  }: {
    enableParticles: boolean;
    enableDataFlow: boolean;
  }) => (
    <div
      data-testid="hero-background"
      data-particles={enableParticles}
      data-dataflow={enableDataFlow}
    />
  ),
}));

jest.mock('../HeroContent', () => ({
  __esModule: true,
  default: () => <div data-testid="hero-content">HeroContent</div>,
}));

jest.mock('../PopularTokens', () => ({
  __esModule: true,
  default: ({
    tokens,
    onTokenClick,
  }: {
    tokens: string[];
    onTokenClick: (token: string) => void;
  }) => (
    <div data-testid="popular-tokens">
      {tokens.map((token) => (
        <button key={token} onClick={() => onTokenClick(token)} data-testid={`token-${token}`}>
          {token}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('../SearchInput', () => ({
  __esModule: true,
  default: ({
    searchQuery,
    onSearchQueryChange,
    onSearch,
  }: {
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    onSearch: (item: string) => void;
  }) => (
    <div data-testid="search-input">
      <input
        data-testid="search-input-field"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
      />
      <button data-testid="search-button" onClick={() => onSearch('BTC')}>
        Search
      </button>
    </div>
  ),
}));

jest.mock('@/lib/constants/searchConfig', () => ({
  searchAll: () => [],
  getTokenSymbol: () => null,
}));

jest.mock('@/lib/utils/searchHistory', () => ({
  getSearchHistory: () => [],
  saveSearchHistory: jest.fn(),
  clearSearchHistory: jest.fn(),
  removeFromSearchHistory: jest.fn(),
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

const renderProfessionalHero = () => {
  return render(<ProfessionalHero />, { wrapper: createWrapper() });
};

describe('ProfessionalHero', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基础渲染', () => {
    it('应该正确渲染组件', () => {
      renderProfessionalHero();

      expect(screen.getByTestId('hero-background')).toBeInTheDocument();
      expect(screen.getByTestId('hero-content')).toBeInTheDocument();
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByTestId('popular-tokens')).toBeInTheDocument();
    });

    it('应该渲染 HeroBackground 并启用粒子效果', () => {
      renderProfessionalHero();

      const background = screen.getByTestId('hero-background');
      expect(background).toHaveAttribute('data-particles', 'true');
      expect(background).toHaveAttribute('data-dataflow', 'false');
    });

    it('应该渲染热门代币', () => {
      renderProfessionalHero();

      expect(screen.getByTestId('token-BTC')).toBeInTheDocument();
      expect(screen.getByTestId('token-ETH')).toBeInTheDocument();
    });
  });

  describe('动画效果', () => {
    it('初始状态应该不可见', () => {
      renderProfessionalHero();

      const container = screen.getByTestId('hero-content').parentElement;
      expect(container).toHaveStyle({ opacity: '0' });
    });

    it('延迟后应该变为可见', async () => {
      renderProfessionalHero();

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        const container = screen.getByTestId('hero-content').parentElement;
        expect(container).toHaveStyle({ opacity: '1' });
      });
    });
  });

  describe('搜索功能', () => {
    it('点击搜索按钮应该导航到价格查询页面', () => {
      renderProfessionalHero();

      const searchButton = screen.getByTestId('search-button');
      fireEvent.click(searchButton);

      expect(mockPush).toHaveBeenCalledWith('/en/price-query?symbol=BTC');
    });
  });

  describe('热门代币交互', () => {
    it('点击热门代币应该触发搜索', () => {
      renderProfessionalHero();

      const ethToken = screen.getByTestId('token-ETH');
      fireEvent.click(ethToken);

      expect(mockPush).toHaveBeenCalledWith('/en/price-query?symbol=ETH');
    });
  });
});
