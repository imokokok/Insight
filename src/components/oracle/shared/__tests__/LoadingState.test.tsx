import { render, screen } from '@testing-library/react';

import {
  LoadingState,
  PageLoadingState,
  CardLoadingState,
  InlineLoadingState,
} from '../LoadingState';

jest.mock('@/i18n', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/ui/Skeleton', () => ({
  Skeleton: ({
    variant,
    width,
    height,
    className,
    style,
  }: {
    variant?: string;
    width?: number;
    height?: number;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div
      data-testid="skeleton"
      data-variant={variant}
      data-width={width}
      data-height={height}
      className={className}
      style={style}
    />
  ),
}));

describe('LoadingState', () => {
  describe('基础渲染', () => {
    it('应该渲染默认加载状态', () => {
      render(<LoadingState />);

      expect(screen.getByText('status.loading')).toBeInTheDocument();
    });

    it('应该渲染自定义消息', () => {
      render(<LoadingState message="自定义加载中..." />);

      expect(screen.getByText('自定义加载中...')).toBeInTheDocument();
    });

    it('应该显示加载图标', () => {
      const { container } = render(<LoadingState showSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('应该显示骨架屏而不是加载图标', () => {
      render(<LoadingState showSpinner={false} />);

      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });
  });

  describe('变体测试', () => {
    it('应该渲染 page 变体', () => {
      const { container } = render(<LoadingState variant="page" />);

      expect(container.firstChild).toHaveClass('min-h-screen');
    });

    it('应该渲染 card 变体', () => {
      const { container } = render(<LoadingState variant="card" />);

      expect(container.firstChild).toHaveClass('bg-white', 'rounded-lg');
    });

    it('应该渲染 inline 变体', () => {
      const { container } = render(<LoadingState variant="inline" />);

      expect(container.firstChild).toHaveClass('flex', 'items-center', 'justify-center');
    });
  });

  describe('尺寸测试', () => {
    it('应该渲染 sm 尺寸', () => {
      const { container } = render(<LoadingState size="sm" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('w-6', 'h-6');
    });

    it('应该渲染 md 尺寸', () => {
      const { container } = render(<LoadingState size="md" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('w-10', 'h-10');
    });

    it('应该渲染 lg 尺寸', () => {
      const { container } = render(<LoadingState size="lg" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('w-14', 'h-14');
    });
  });

  describe('主题颜色测试', () => {
    it('应该应用蓝色主题', () => {
      const { container } = render(<LoadingState themeColor="blue" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('text-blue-600');
    });

    it('应该应用绿色主题', () => {
      const { container } = render(<LoadingState themeColor="green" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('text-green-600');
    });

    it('应该应用紫色主题', () => {
      const { container } = render(<LoadingState themeColor="purple" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('text-purple-600');
    });

    it('应该应用自定义十六进制颜色', () => {
      const { container } = render(<LoadingState themeColor="#ff0000" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveStyle({ color: '#ff0000' });
    });
  });

  describe('自定义类名', () => {
    it('应该应用自定义类名', () => {
      const { container } = render(<LoadingState className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('PageLoadingState', () => {
  it('应该渲染页面加载状态', () => {
    const { container } = render(<PageLoadingState />);

    expect(container.firstChild).toHaveClass('min-h-screen');
  });

  it('应该传递主题颜色', () => {
    const { container } = render(<PageLoadingState themeColor="green" />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('text-green-600');
  });

  it('应该传递自定义消息', () => {
    render(<PageLoadingState message="页面加载中..." />);

    expect(screen.getByText('页面加载中...')).toBeInTheDocument();
  });
});

describe('CardLoadingState', () => {
  it('应该渲染卡片加载状态', () => {
    const { container } = render(<CardLoadingState />);

    expect(container.firstChild).toHaveClass('bg-white', 'rounded-lg');
  });

  it('应该默认使用 sm 尺寸', () => {
    const { container } = render(<CardLoadingState />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('w-6', 'h-6');
  });

  it('应该支持自定义尺寸', () => {
    const { container } = render(<CardLoadingState size="lg" />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('w-14', 'h-14');
  });
});

describe('InlineLoadingState', () => {
  it('应该渲染内联加载状态', () => {
    const { container } = render(<InlineLoadingState />);

    expect(container.firstChild).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('应该默认使用 sm 尺寸', () => {
    const { container } = render(<InlineLoadingState />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('w-6', 'h-6');
  });

  it('应该支持自定义尺寸', () => {
    const { container } = render(<InlineLoadingState size="md" />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('w-10', 'h-10');
  });
});
