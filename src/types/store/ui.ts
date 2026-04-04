import type { ThemeMode } from '@/types/ui/theme';

export interface ChartPreferences {
  showGrid: boolean;
  showLegend: boolean;
  showTooltip: boolean;
  animation: boolean;
  defaultTimeRange: '1H' | '24H' | '7D' | '30D' | '90D' | '1Y';
  defaultChartType: 'line' | 'area' | 'bar';
  colorScheme: 'default' | 'colorblind' | 'highContrast';
}

export interface StoreUIState {
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  language: string;
  chartPreferences: ChartPreferences;
}

export interface StoreUIActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: string) => void;
  setChartPreferences: (preferences: ChartPreferences) => void;
  reset: () => void;
}

export type StoreUIStore = StoreUIState & StoreUIActions;
