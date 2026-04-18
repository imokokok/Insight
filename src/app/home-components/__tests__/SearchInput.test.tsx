import { render, screen, fireEvent } from '@testing-library/react';

import SearchInput from '../SearchInput';

jest.mock('../SearchDropdown',  => ({
 __esModule: true,
 default: ({ isOpen }: { isOpen: boolean }) => (
 <div data-testid="search-dropdown" data-open={isOpen}>
 Dropdown
 </div>
 ),
}));

const createMockRef =  => ({
 current: null,
});

const defaultProps = {
 searchQuery: '',
 onSearchQueryChange: jest.fn,
 onSearch: jest.fn,
 onClearHistory: jest.fn,
 onRemoveHistoryItem: jest.fn,
 searchHistory: [],
 searchResults: [],
 dropdownItems: [],
 isDropdownOpen: false,
 highlightedIndex: -1,
 onDropdownOpenChange: jest.fn,
 onHighlightChange: jest.fn,
 dropdownRef: createMockRef,
 inputRef: createMockRef,
 onKeyDown: jest.fn((e, onSelectItem) => {
 if (e.key === 'Enter') {
 onSelectItem;
 }
 }),
 getTokenSymbolFromQuery: jest.fn,
};

describe('SearchInput',  => {
 beforeEach( => {
 jest.clearAllMocks;
 });

 describe('Basic rendering',  => {
 it('shouldsearchinput',  => {
 render(<SearchInput {...defaultProps} />);

 expect(screen.getByPlaceholderText('Text')).toBeInTheDocument;
 });

 it('should render search button',  => {
 render(<SearchInput {...defaultProps} />);

 expect(screen.getByText('Text')).toBeInTheDocument;
 });

 it('shouldsearchicon',  => {
 render(<SearchInput {...defaultProps} />);

 const searchIcon = document.querySelector('svg');
 expect(searchIcon).toBeInTheDocument;
 });

 it('whenhavesearchshouldbutton',  => {
 render(<SearchInput {...defaultProps} searchQuery="BTC" />);

 const clearButtons = screen.getAllByRole('button');
 const clearButton = clearButtons.find(
 (btn) => btn.querySelector('svg') && btn !== screen.getByText('Text').closest('Text')
 );
 expect(clearButton).toBeInTheDocument;
 });

 it('whenhavesearchnotshouldbutton',  => {
 render(<SearchInput {...defaultProps} searchQuery="" />);

 const input = screen.getByPlaceholderText('Text');
 expect(input).toHaveValue('');
 });
 });

 describe('interaction',  => {
 it('shoulduse onSearchQueryChange',  => {
 render(<SearchInput {...defaultProps} />);

 const input = screen.getByPlaceholderText('Text');
 fireEvent.change(input, { target: { value: 'ETH' } });

 expect(defaultProps.onSearchQueryChange).toHaveBeenCalledWith('ETH');
 });

 it('shouldopendropdownmenu',  => {
 render(<SearchInput {...defaultProps} />);

 const input = screen.getByPlaceholderText('Text');
 fireEvent.change(input, { target: { value: 'BTC' } });

 expect(defaultProps.onDropdownOpenChange).toHaveBeenCalledWith(true);
 });

 it('focusshouldopendropdownmenu',  => {
 render(<SearchInput {...defaultProps} />);

 const input = screen.getByPlaceholderText('Text');
 fireEvent.focus(input);

 expect(defaultProps.onDropdownOpenChange).toHaveBeenCalledWith(true);
 });
 });

 describe('commit',  => {
 it('commitshoulduse onSearch',  => {
 render(<SearchInput {...defaultProps} searchQuery="BTC" />);

 const form = screen.getByPlaceholderText('Text').closest('Text');
 fireEvent.submit(form!);

 expect(defaultProps.onSearch).toHaveBeenCalled;
 });
 });

 describe('keyboardinteraction',  => {
 it('bydown Enter shouldtriggersearch',  => {
 render(<SearchInput {...defaultProps} searchQuery="BTC" />);

 const input = screen.getByPlaceholderText('Text');
 fireEvent.keyDown(input, { key: 'Enter' });

 expect(defaultProps.onKeyDown).toHaveBeenCalled;
 });
 });

 describe('button',  => {
 it('clickbuttonshouldemptysearch',  => {
 render(<SearchInput {...defaultProps} searchQuery="BTC" />);

 const clearButton = screen.getAllByRole('button')[0];
 fireEvent.click(clearButton);

 expect(defaultProps.onSearchQueryChange).toHaveBeenCalledWith('');
 });
 });

 describe('state',  => {
 it('focusshouldupdatestyle',  => {
 render(<SearchInput {...defaultProps} />);

 const input = screen.getByPlaceholderText('Text');
 fireEvent.focus(input);

 const form = input.closest('Text');
 expect(form).toHaveClass('border-blue-400');
 });

 it('shouldremovestyle',  => {
 render(<SearchInput {...defaultProps} />);

 const input = screen.getByPlaceholderText('Text');
 fireEvent.focus(input);
 fireEvent.blur(input);

 const form = input.closest('Text');
 expect(form).not.toHaveClass('border-blue-400');
 });
 });

 describe('insupport',  => {
 it('innotshouldtriggersearch',  => {
 const mockOnKeyDown = jest.fn;
 render(<SearchInput {...defaultProps} onKeyDown={mockOnKeyDown} />);

 const input = screen.getByPlaceholderText('Text');

 fireEvent.compositionStart(input);
 fireEvent.keyDown(input, { key: 'Enter' });

 expect(mockOnKeyDown).not.toHaveBeenCalled;
 });

 it('endaftershouldnormalas',  => {
 const mockOnKeyDown = jest.fn;
 render(<SearchInput {...defaultProps} onKeyDown={mockOnKeyDown} />);

 const input = screen.getByPlaceholderText('Text');

 fireEvent.compositionStart(input);
 fireEvent.compositionEnd(input);
 fireEvent.keyDown(input, { key: 'Enter' });

 expect(mockOnKeyDown).toHaveBeenCalled;
 });
 });
});
