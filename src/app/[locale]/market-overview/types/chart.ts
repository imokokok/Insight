/**
 * 图表相关类型定义
 */

/**
 * 图表类型
 */
export type ChartType =
  | 'pie'
  | 'trend'
  | 'bar'
  | 'chain'
  | 'protocol'
  | 'asset'
  | 'comparison'
  | 'benchmark'
  | 'correlation';

/**
 * 视图类型
 */
export type ViewType = 'chart' | 'table';

/**
 * 对比模式
 */
export type ComparisonMode = 'none' | 'yoy' | 'mom';

/**
 * 图表类型（趋势图）
 */
export type TrendChartType = 'line' | 'area' | 'candle';

/**
 * 时间范围
 */
export interface TimeRange {
  /** 键值 */
  key: string;
  /** 显示标签 */
  label: string;
  /** 小时数 */
  hours: number;
}

/**
 * TVS 趋势数据
 */
export interface TVSTrendData {
  /** 时间戳 */
  timestamp: number;
  /** 日期字符串 */
  date: string;
  /** 各预言机 TVS 数据 */
  chainlink: number;
  chainlinkUpper: number;
  chainlinkLower: number;
  pyth: number;
  pythUpper: number;
  pythLower: number;
  band: number;
  bandUpper: number;
  bandLower: number;
  api3: number;
  api3Upper: number;
  api3Lower: number;
  uma: number;
  umaUpper: number;
  umaLower: number;
  redstone: number;
  redstoneUpper: number;
  redstoneLower: number;
  dia: number;
  diaUpper: number;
  diaLower: number;
  winklink: number;
  winklinkUpper: number;
  winklinkLower: number;
  /** 总计 */
  total: number;
}

/**
 * 雷达图数据点
 */
export interface RadarDataPoint {
  /** 指标名称 */
  metric: string;
  /** 满分值 */
  fullMark: number;
  /** 各预言机数值 */
  [oracle: string]: string | number;
}

/**
 * 异常数据
 */
export interface AnomalyData {
  /** 异常ID */
  id: string;
  /** 异常类型 */
  type: AnomalyType;
  /** 异常等级 */
  level: AnomalyLevel;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 时间戳 */
  timestamp: number;
  /** 相关资产 - 可选 */
  asset?: string;
  /** 相关预言机 - 可选 */
  oracle?: string;
  /** 当前值 */
  value: number;
  /** 预期值 */
  expectedValue: number;
  /** 偏差值 */
  deviation: number;
  /** 持续时间 */
  duration: number;
  /** 是否已确认 */
  acknowledged: boolean;
  /** 置信度 - 可选 */
  confidence?: number;
}

/**
 * 异常等级
 */
export type AnomalyLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 异常类型
 */
export type AnomalyType =
  | 'price_spike'
  | 'price_drop'
  | 'volatility_spike'
  | 'trend_break'
  | 'volume_anomaly'
  | 'correlation_break';

/**
 * 选中的异常数据
 */
export interface SelectedAnomaly {
  /** 数据键 */
  dataKey: string;
  /** 日期 */
  date: string;
  /** 当前值 */
  value: number;
  /** 前值 */
  prevValue: number;
  /** 变化率 */
  changeRate: number;
}

/**
 * 缩放范围
 */
export interface ZoomRange {
  /** 起始索引 */
  startIndex?: number;
  /** 结束索引 */
  endIndex?: number;
}

/**
 * 链接的预言机
 */
export interface LinkedOracle {
  /** 主预言机 */
  primary: string;
  /** 次预言机 */
  secondary: string;
}

/**
 * 图表容器 Props
 */
export interface ChartContainerProps {
  /** 图表容器引用 */
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  /** 当前图表类型 */
  activeChart: ChartType;
  /** 设置图表类型 */
  setActiveChart: (chart: ChartType) => void;
  /** 视图类型 */
  viewType: ViewType;
  /** 设置视图类型 */
  setViewType: (view: ViewType) => void;
  /** 选中的时间范围 */
  selectedTimeRange: string;
  /** 设置时间范围 */
  setSelectedTimeRange: (range: string) => void;
  /** 选中的项目 */
  selectedItem: string | null;
  /** 设置选中项目 */
  setSelectedItem: (item: string | null) => void;
  /** 悬停的项目 */
  hoveredItem: string | null;
  /** 设置悬停项目 */
  setHoveredItem: (item: string | null) => void;
  /** 链接的预言机 */
  linkedOracle: LinkedOracle | null;
  /** 设置链接的预言机 */
  setLinkedOracle: (link: LinkedOracle | null) => void;
  /** 缩放范围 */
  zoomRange: ZoomRange | null;
  /** 设置缩放范围 */
  setZoomRange: (range: ZoomRange | null) => void;
  /** 异常检测阈值 */
  anomalyThreshold: number;
  /** 设置异常检测阈值 */
  setAnomalyThreshold: (threshold: number) => void;
  /** 选中的异常 */
  selectedAnomaly: SelectedAnomaly | null;
  /** 设置选中的异常 */
  setSelectedAnomaly: (anomaly: SelectedAnomaly | null) => void;
  /** 对比模式 */
  comparisonMode: ComparisonMode;
  /** 设置对比模式 */
  setComparisonMode: (mode: ComparisonMode) => void;
  /** 趋势对比数据 */
  trendComparisonData: TVSTrendData[];
  /** 设置趋势对比数据 */
  setTrendComparisonData: (data: TVSTrendData[]) => void;
  /** 是否显示置信区间 */
  showConfidenceInterval: boolean;
  /** 设置是否显示置信区间 */
  setShowConfidenceInterval: (show: boolean) => void;
  /** 获取图表标题 */
  getChartTitle: () => string;
  /** 加载状态 */
  loading: boolean;
  /** 增强数据加载状态 */
  loadingEnhanced: boolean;
  /** 对比数据加载状态 */
  loadingComparison: boolean;
}
