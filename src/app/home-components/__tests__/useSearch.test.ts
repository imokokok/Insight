import { renderHook, act } from '@testing-library/react';

import { useSearch } from '../hooks/useSearch';

const mockPush = jest.fn;

jest.mock('next/navigation',  => ({
 useRouter:  => ({
 push: mockPush,
 }),
}));

jest.mock('@/lib/constants/searchConfig',  => ({
 searchAll: (query: string) => {
 if (query.toLowerCase === 'btc') {
 return [
 {
 item: { type: 'token', symbol: 'BTC', name: 'Bitcoin', path: '/price-query?symbol=BTC' },
 matches: [],
 score: 1,
 },
 ];
 }
 return [];
 },
 getTokenSymbol: (query: string) => {
 const upper = query.toUpperCase;
 if (['BTC', 'ETH', 'USDT'].includes(upper)) {
 return upper;
 }
 return null;
 },
}));

jest.mock('@/lib/utils/searchHistory',  => ({
 getSearchHistory:  => [
 { symbol: 'ETH', timestamp: Date.now },
 { symbol: 'BTC', timestamp: Date.now - 1000 },
 ],
 saveSearchHistory: jest.fn,
 clearSearchHistory: jest.fn,
 removeFromSearchHistory: jest.fn,
}));

describe('useSearch',  => {
 beforeEach( => {
 jest.clearAllMocks;
 });

 describe('Initial state',  => {
 it('shouldhaveInitial state',  => {
 const { result } = renderHook( => useSearch);

 expect(result.current.searchQuery).toBe('');
 expect(result.current.searchHistory.length).toBe(2);
 expect(result.current.searchResults).toEqual([]);
 });
 });

 describe('search',  => {
 it('setSearchQuery shouldupdatesearch',  => {
 const { result } = renderHook( => useSearch);

 act( => {
 result.current.setSearchQuery('BTC');
 });

 expect(result.current.searchQuery).toBe('BTC');
 });

 it('updatesearchshouldupdatesearchresult',  => {
 const { result } = renderHook( => useSearch);

 act( => {
 result.current.setSearchQuery('BTC');
 });

 expect(result.current.searchResults.length).toBe(1);
 });

 it('emptysearchshouldreturnemptyresult',  => {
 const { result } = renderHook( => useSearch);

 act( => {
 result.current.setSearchQuery(' ');
 });

 expect(result.current.searchResults).toEqual([]);
 });
 });

 describe('searchhandle',  => {
 it('handleSearch usestringshouldnavigationtoquerypage',  => {
 const { result } = renderHook( => useSearch);

 act( => {
 result.current.handleSearch('BTC');
 });

 expect(mockPush).toHaveBeenCalledWith('/en/price-query?symbol=BTC');
 });

 it('handleSearch shouldspecification',  => {
 const { result } = renderHook( => useSearch);

 act( => {
 result.current.handleSearch('btc');
 });

 expect(mockPush).toHaveBeenCalledWith('/en/price-query?symbol=BTC');
 });

 it('handleSearch useemptystringnotshouldnavigation',  => {
 const { result } = renderHook( => useSearch);

 act( => {
 result.current.handleSearch(' ');
 });

 expect(mockPush).not.toHaveBeenCalled;
 });

 it('handleSearch usesearchresultshouldnavigationtopath',  => {
 const { result } = renderHook( => useSearch);

 const searchResult = {
 item: { type: 'token', symbol: 'ETH', name: 'Ethereum', path: '/price-query?symbol=ETH' },
 matches: [],
 score: 1,
 };

 act( => {
 result.current.handleSearch(searchResult);
 });

 expect(mockPush).toHaveBeenCalledWith('/en/price-query?symbol=ETH');
 });
 });

 describe('historyrecord',  => {
 it('handleClearHistory shoulduse clearSearchHistory',  => {
 const { result } = renderHook( => useSearch);

 act( => {
 result.current.handleClearHistory;
 });

 const { clearSearchHistory } = jest.requireMock('@/lib/utils/searchHistory');
 expect(clearSearchHistory).toHaveBeenCalled;
 });

 it('handleRemoveHistoryItem shoulduse removeFromSearchHistory',  => {
 const { result } = renderHook( => useSearch);

 act( => {
 result.current.handleRemoveHistoryItem('ETH');
 });

 const { removeFromSearchHistory } = jest.requireMock('@/lib/utils/searchHistory');
 expect(removeFromSearchHistory).toHaveBeenCalledWith('ETH');
 });
 });

 describe('Utility functions',  => {
 it('getTokenSymbolFromQuery shouldreturn',  => {
 const { result } = renderHook( => useSearch);

 const symbol = result.current.getTokenSymbolFromQuery('btc');
 expect(symbol).toBe('BTC');
 });

 it('getTokenSymbolFromQuery forshouldreturn null',  => {
 const { result } = renderHook( => useSearch);

 const symbol = result.current.getTokenSymbolFromQuery('UNKNOWN');
 expect(symbol).toBeNull;
 });
 });
});
