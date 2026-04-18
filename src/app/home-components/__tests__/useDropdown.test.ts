import { renderHook, act } from '@testing-library/react';

import { useDropdown } from '../hooks/useDropdown';

const mockSearchResults = [
 {
 item: { type: 'token', symbol: 'BTC', name: 'Bitcoin', path: '/price-query?symbol=BTC' },
 matches: [],
 score: 1,
 },
 {
 item: { type: 'token', symbol: 'ETH', name: 'Ethereum', path: '/price-query?symbol=ETH' },
 matches: [],
 score: 0.9,
 },
];

const mockSearchHistory = [
 { symbol: 'BTC', timestamp: Date.now },
 { symbol: 'ETH', timestamp: Date.now - 1000 },
];

describe('useDropdown',  => {
 beforeEach( => {
 jest.clearAllMocks;
 });

 describe('Initial state',  => {
 it('shouldhaveInitial state',  => {
 const { result } = renderHook( => useDropdown('', [], []));

 expect(result.current.isDropdownOpen).toBe(false);
 expect(result.current.highlightedIndex).toBe(-1);
 expect(result.current.POPULAR_TOKENS).toEqual([
 'BTC',
 'ETH',
 'BNB',
 'AVAX',
 'MATIC',
 'USDT',
 'USDC',
 ]);
 });
 });

 describe('dropdownmenuproject',  => {
 it('whenhavesearchhavehistoryrecord，shouldhistoryrecord',  => {
 const { result } = renderHook( => useDropdown('', [], mockSearchHistory));

 const historyItems = result.current.dropdownItems.filter((item) => item.type === 'history');
 expect(historyItems.length).toBe(2);
 });

 it('whenhavesearch，should',  => {
 const { result } = renderHook( => useDropdown('', [], []));

 const popularItems = result.current.dropdownItems.filter((item) => item.type === 'popular');
 expect(popularItems.length).toBeGreaterThan(0);
 });

 it('whenhavesearch，shouldsearchresult',  => {
 const { result } = renderHook( => useDropdown('BTC', mockSearchResults, []));

 const searchItems = result.current.dropdownItems.filter((item) => item.type === 'search');
 expect(searchItems.length).toBe(2);
 });

 it('dropdownmenuprojectshouldin10withwithin',  => {
 const manyResults = Array.from({ length: 15 }, (_, i) => ({
 item: {
 type: 'token',
 symbol: `TOKEN${i}`,
 name: `Token ${i}`,
 path: `/price-query?symbol=TOKEN${i}`,
 },
 matches: [],
 score: 1 - i * 0.01,
 }));

 const { result } = renderHook( => useDropdown('TOKEN', manyResults, []));

 expect(result.current.dropdownItems.length).toBeLessThanOrEqual(10);
 });
 });

 describe('dropdownmenu',  => {
 it('openDropdown shouldopendropdownmenu',  => {
 const { result } = renderHook( => useDropdown('', [], []));

 act( => {
 result.current.openDropdown;
 });

 expect(result.current.isDropdownOpen).toBe(true);
 });

 it('closeDropdown shouldclosedropdownmenuresetindex',  => {
 const { result } = renderHook( => useDropdown('', [], []));

 act( => {
 result.current.openDropdown;
 result.current.setHighlightedIndex(2);
 });

 act( => {
 result.current.closeDropdown;
 });

 expect(result.current.isDropdownOpen).toBe(false);
 expect(result.current.highlightedIndex).toBe(-1);
 });

 it('setIsDropdownOpen shouldupdatedropdownmenustate',  => {
 const { result } = renderHook( => useDropdown('', [], []));

 act( => {
 result.current.setIsDropdownOpen(true);
 });

 expect(result.current.isDropdownOpen).toBe(true);
 });
 });

 describe('keyboardnavigation',  => {
 it('bydownheadshouldtodown',  => {
 const { result } = renderHook( => useDropdown('', [], []));

 act( => {
 result.current.setIsDropdownOpen(true);
 });

 const mockEvent = {
 key: 'ArrowDown',
 preventDefault: jest.fn,
 } as unknown as React.KeyboardEvent;
 const mockOnSelect = jest.fn;

 act( => {
 result.current.handleKeyDown(mockEvent, mockOnSelect);
 });

 expect(result.current.highlightedIndex).toBe(0);
 });

 it('bydownonheadshouldtoon',  => {
 const { result } = renderHook( => useDropdown('', [], []));

 act( => {
 result.current.setIsDropdownOpen(true);
 result.current.setHighlightedIndex(2);
 });

 const mockEvent = {
 key: 'ArrowUp',
 preventDefault: jest.fn,
 } as unknown as React.KeyboardEvent;
 const mockOnSelect = jest.fn;

 act( => {
 result.current.handleKeyDown(mockEvent, mockOnSelect);
 });

 expect(result.current.highlightedIndex).toBe(1);
 });

 it('bydown Escape shouldclosedropdownmenu',  => {
 const { result } = renderHook( => useDropdown('', [], []));

 act( => {
 result.current.setIsDropdownOpen(true);
 });

 const mockEvent = {
 key: 'Escape',
 preventDefault: jest.fn,
 } as unknown as React.KeyboardEvent;
 const mockOnSelect = jest.fn;

 act( => {
 result.current.handleKeyDown(mockEvent, mockOnSelect);
 });

 expect(result.current.isDropdownOpen).toBe(false);
 });

 it('bydown Enter shoulduse onSelectItem',  => {
 const { result } = renderHook( => useDropdown('', [], []));

 act( => {
 result.current.setIsDropdownOpen(true);
 });

 const mockEvent = {
 key: 'Enter',
 preventDefault: jest.fn,
 } as unknown as React.KeyboardEvent;
 const mockOnSelect = jest.fn;

 act( => {
 result.current.handleKeyDown(mockEvent, mockOnSelect);
 });

 expect(mockOnSelect).toHaveBeenCalled;
 });

 it('whendropdownmenuclose，bydownheadshouldopen',  => {
 const { result } = renderHook( => useDropdown('', [], mockSearchHistory));

 const mockEvent = {
 key: 'ArrowDown',
 preventDefault: jest.fn,
 } as unknown as React.KeyboardEvent;
 const mockOnSelect = jest.fn;

 act( => {
 result.current.handleKeyDown(mockEvent, mockOnSelect);
 });

 expect(result.current.isDropdownOpen).toBe(true);
 expect(result.current.highlightedIndex).toBe(0);
 });
 });

 describe('Edge cases',  => {
 it('indexnotshouldprojectcount',  => {
 const { result } = renderHook( => useDropdown('', [], []));

 act( => {
 result.current.setIsDropdownOpen(true);
 });

 const maxIndex = result.current.dropdownItems.length - 1;

 act( => {
 result.current.setHighlightedIndex(maxIndex);
 });

 const mockEvent = {
 key: 'ArrowDown',
 preventDefault: jest.fn,
 } as unknown as React.KeyboardEvent;
 const mockOnSelect = jest.fn;

 act( => {
 result.current.handleKeyDown(mockEvent, mockOnSelect);
 });

 expect(result.current.highlightedIndex).toBe(maxIndex);
 });

 it('indexnotshould -1',  => {
 const { result } = renderHook( => useDropdown('', [], []));

 act( => {
 result.current.setIsDropdownOpen(true);
 result.current.setHighlightedIndex(0);
 });

 const mockEvent = {
 key: 'ArrowUp',
 preventDefault: jest.fn,
 } as unknown as React.KeyboardEvent;
 const mockOnSelect = jest.fn;

 act( => {
 result.current.handleKeyDown(mockEvent, mockOnSelect);
 });

 expect(result.current.highlightedIndex).toBe(-1);
 });
 });
});
