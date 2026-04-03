export interface TooltipProps<T = unknown> {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey?: string;
    payload?: T;
  }>;
  label?: string;
}

export interface CustomLabelProps {
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  value?: number;
  index?: number;
  payload?: Record<string, unknown>;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

export interface CustomDotProps<T = unknown> {
  cx?: number;
  cy?: number;
  payload?: T;
  value?: number;
  index?: number;
}

export interface ChartMargin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface ChartDataPoint {
  name?: string;
  value?: number;
  [key: string]: string | number | undefined;
}

export interface LegendPayloadItem {
  value?: string;
  type?: string;
  id?: string;
  dataKey?: string | number | ((obj: unknown) => unknown);
  color?: string;
  payload?: {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    name?: string;
  };
}

export type LegendClickEventHandler = (event: LegendPayloadItem) => void;

export type LegendMouseEventHandler = (event: LegendPayloadItem) => void;
