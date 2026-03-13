export interface TooltipPayload<T = Record<string, unknown>> {
  name: string;
  value: number | string;
  color: string;
  dataKey: string;
  payload: T;
}

export interface TooltipProps<T = Record<string, unknown>> {
  active?: boolean;
  payload?: TooltipPayload<T>[];
  label?: string;
}

export interface CustomDotProps<T = Record<string, unknown>> {
  cx?: number;
  cy?: number;
  payload?: T;
}

export interface CustomLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  index?: number;
}

export interface LegendClickEvent {
  dataKey: string;
  color: string;
  type: string;
  value: string;
}

export interface ScatterShapeProps {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  payload?: Record<string, unknown>;
}
