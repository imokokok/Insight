import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

import { type Blockchain } from '@/types/oracle';

interface UIState {
  visibleChains: Blockchain[];
  tableFilter: 'all' | 'abnormal' | 'normal';
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

interface CrossChainUIStore extends UIState {
  setVisibleChains: (chains: Blockchain[]) => void;
  setTableFilter: (filter: 'all' | 'abnormal' | 'normal') => void;
  setSortColumn: (column: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;

  toggleChain: (chain: Blockchain) => void;
  handleSort: (column: string) => void;
}

const initialState: UIState = {
  visibleChains: [],
  tableFilter: 'all',
  sortColumn: 'chain',
  sortDirection: 'asc',
};

export const useCrossChainUIStore = create<CrossChainUIStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setVisibleChains: (chains) => set({ visibleChains: chains }),
        setTableFilter: (filter) => set({ tableFilter: filter }),
        setSortColumn: (column) => set({ sortColumn: column }),
        setSortDirection: (direction) => set({ sortDirection: direction }),

        toggleChain: (chain) => {
          const { visibleChains } = get();
          if (visibleChains.includes(chain)) {
            set({ visibleChains: visibleChains.filter((c) => c !== chain) });
          } else {
            set({ visibleChains: [...visibleChains, chain] });
          }
        },

        handleSort: (column) => {
          const { sortColumn, sortDirection } = get();
          if (sortColumn === column) {
            set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' });
          } else {
            set({ sortColumn: column, sortDirection: 'asc' });
          }
        },
      }),
      {
        name: 'cross-chain-ui-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          tableFilter: state.tableFilter,
          sortColumn: state.sortColumn,
          sortDirection: state.sortDirection,
        }),
      }
    ),
    { name: 'CrossChainUIStore' }
  )
);
