import { render, screen, fireEvent } from '@testing-library/react';

import PopularTokens from '../PopularTokens';

describe('PopularTokens', () => {
  const mockOnTokenClick = jest.fn();
  const defaultTokens = ['BTC', 'ETH', 'BNB', 'AVAX', 'MATIC'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基础渲染', () => {
    it('应该正确渲染所有代币按钮', () => {
      render(<PopularTokens tokens={defaultTokens} onTokenClick={mockOnTokenClick} />);

      defaultTokens.forEach((token) => {
        expect(screen.getByText(token)).toBeInTheDocument();
      });
    });

    it('应该渲染热门标签', () => {
      render(<PopularTokens tokens={defaultTokens} onTokenClick={mockOnTokenClick} />);

      expect(screen.getByText('home.hero.popular:')).toBeInTheDocument();
    });

    it('应该渲染空代币列表', () => {
      render(<PopularTokens tokens={[]} onTokenClick={mockOnTokenClick} />);

      expect(screen.getByText('home.hero.popular:')).toBeInTheDocument();
    });
  });

  describe('交互', () => {
    it('点击代币按钮应该调用 onTokenClick', () => {
      render(<PopularTokens tokens={defaultTokens} onTokenClick={mockOnTokenClick} />);

      const btcButton = screen.getByText('BTC');
      fireEvent.click(btcButton);

      expect(mockOnTokenClick).toHaveBeenCalledWith('BTC');
      expect(mockOnTokenClick).toHaveBeenCalledTimes(1);
    });

    it('点击不同代币应该传递正确的参数', () => {
      render(<PopularTokens tokens={defaultTokens} onTokenClick={mockOnTokenClick} />);

      fireEvent.click(screen.getByText('ETH'));
      expect(mockOnTokenClick).toHaveBeenCalledWith('ETH');

      fireEvent.click(screen.getByText('MATIC'));
      expect(mockOnTokenClick).toHaveBeenCalledWith('MATIC');

      expect(mockOnTokenClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('样式', () => {
    it('代币按钮应该有正确的样式类', () => {
      render(<PopularTokens tokens={['BTC']} onTokenClick={mockOnTokenClick} />);

      const button = screen.getByText('BTC');
      expect(button).toHaveClass('flex-shrink-0');
      expect(button).toHaveClass('rounded-full');
    });
  });
});
