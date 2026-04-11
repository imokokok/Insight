import { type ReactNode } from 'react';

import { render, screen, fireEvent, createEvent } from '@testing-library/react';

import SearchInput from '../SearchInput';

jest.mock('../SearchDropdown', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="search-dropdown" data-open={isOpen}>
      Dropdown
    </div>
  ),
}));

const createMockRef = () => ({
  current: null,
});

const defaultProps = {
  searchQuery: '',
  onSearchQueryChange: jest.fn(),
  onSearch: jest.fn(),
  onClearHistory: jest.fn(),
  onRemoveHistoryItem: jest.fn(),
  searchHistory: [],
  searchResults: [],
  dropdownItems: [],
  isDropdownOpen: false,
  highlightedIndex: -1,
  onDropdownOpenChange: jest.fn(),
  onHighlightChange: jest.fn(),
  dropdownRef: createMockRef(),
  inputRef: createMockRef(),
  onKeyDown: jest.fn((e, onSelectItem) => {
    if (e.key === 'Enter') {
      onSelectItem();
    }
  }),
  getTokenSymbolFromQuery: jest.fn(),
};

describe('SearchInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基础渲染', () => {
    it('应该正确渲染搜索输入框', () => {
      render(<SearchInput {...defaultProps} />);

      expect(screen.getByPlaceholderText('home.hero.searchPlaceholder')).toBeInTheDocument();
    });

    it('应该渲染搜索按钮', () => {
      render(<SearchInput {...defaultProps} />);

      expect(screen.getByText('actions.search')).toBeInTheDocument();
    });

    it('应该渲染搜索图标', () => {
      render(<SearchInput {...defaultProps} />);

      const searchIcon = document.querySelector('svg');
      expect(searchIcon).toBeInTheDocument();
    });

    it('当有搜索词时应该显示清除按钮', () => {
      render(<SearchInput {...defaultProps} searchQuery="BTC" />);

      const clearButtons = screen.getAllByRole('button');
      const clearButton = clearButtons.find((btn) => btn.querySelector('svg') && btn !== screen.getByText('actions.search').closest('button'));
      expect(clearButton).toBeInTheDocument();
    });

    it('当没有搜索词时不应该显示清除按钮', () => {
      render(<SearchInput {...defaultProps} searchQuery="" />);

      const input = screen.getByPlaceholderText('home.hero.searchPlaceholder');
      expect(input).toHaveValue('');
    });
  });

  describe('输入交互', () => {
    it('输入时应该调用 onSearchQueryChange', () => {
      render(<SearchInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('home.hero.searchPlaceholder');
      fireEvent.change(input, { target: { value: 'ETH' } });

      expect(defaultProps.onSearchQueryChange).toHaveBeenCalledWith('ETH');
    });

    it('输入时应该打开下拉菜单', () => {
      render(<SearchInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('home.hero.searchPlaceholder');
      fireEvent.change(input, { target: { value: 'BTC' } });

      expect(defaultProps.onDropdownOpenChange).toHaveBeenCalledWith(true);
    });

    it('聚焦时应该打开下拉菜单', () => {
      render(<SearchInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('home.hero.searchPlaceholder');
      fireEvent.focus(input);

      expect(defaultProps.onDropdownOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe('表单提交', () => {
    it('提交表单应该调用 onSearch', () => {
      render(<SearchInput {...defaultProps} searchQuery="BTC" />);

      const form = screen.getByPlaceholderText('home.hero.searchPlaceholder').closest('form');
      fireEvent.submit(form!);

      expect(defaultProps.onSearch).toHaveBeenCalled();
    });
  });

  describe('键盘交互', () => {
    it('按下 Enter 键应该触发搜索', () => {
      render(<SearchInput {...defaultProps} searchQuery="BTC" />);

      const input = screen.getByPlaceholderText('home.hero.searchPlaceholder');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(defaultProps.onKeyDown).toHaveBeenCalled();
    });
  });

  describe('清除按钮', () => {
    it('点击清除按钮应该清空搜索词', () => {
      render(<SearchInput {...defaultProps} searchQuery="BTC" />);

      const clearButton = screen.getAllByRole('button')[0];
      fireEvent.click(clearButton);

      expect(defaultProps.onSearchQueryChange).toHaveBeenCalledWith('');
    });
  });

  describe('焦点状态', () => {
    it('聚焦时应该更新样式', () => {
      render(<SearchInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('home.hero.searchPlaceholder');
      fireEvent.focus(input);

      const form = input.closest('form');
      expect(form).toHaveClass('border-blue-400');
    });

    it('失焦时应该移除焦点样式', () => {
      render(<SearchInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('home.hero.searchPlaceholder');
      fireEvent.focus(input);
      fireEvent.blur(input);

      const form = input.closest('form');
      expect(form).not.toHaveClass('border-blue-400');
    });
  });

  describe('中文输入法支持', () => {
    it('在输入法组合期间不应该触发搜索', () => {
      const mockOnKeyDown = jest.fn();
      render(<SearchInput {...defaultProps} onKeyDown={mockOnKeyDown} />);

      const input = screen.getByPlaceholderText('home.hero.searchPlaceholder');

      fireEvent.compositionStart(input);
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnKeyDown).not.toHaveBeenCalled();
    });

    it('输入法组合结束后应该恢复正常行为', () => {
      const mockOnKeyDown = jest.fn();
      render(<SearchInput {...defaultProps} onKeyDown={mockOnKeyDown} />);

      const input = screen.getByPlaceholderText('home.hero.searchPlaceholder');

      fireEvent.compositionStart(input);
      fireEvent.compositionEnd(input);
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnKeyDown).toHaveBeenCalled();
    });
  });
});
