/**
 * 图表相关 Hooks 统一导出
 */

export { useChartData } from './useChartData';
export type { ChartDataPoint, UseChartDataOptions } from './useChartData';

export { useChartZoom } from './useChartZoom';
export type { ZoomState, UseChartZoomOptions } from './useChartZoom';

export { useChartExport } from './useChartExport';
export type { ExportOptions, ChartData } from './useChartExport';

export { useTechnicalIndicators } from './useTechnicalIndicators';
export type {
  PriceData,
  RSIData,
  MACDData,
  BollingerBandsData,
  MACDSignal,
} from './useTechnicalIndicators';

// 重新导出计算函数
export {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  detectMACDSignals,
} from './useTechnicalIndicators';
