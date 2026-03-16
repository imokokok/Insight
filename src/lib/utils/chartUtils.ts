export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(data: unknown, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatTooltipValue(
  value: number,
  type: 'time' | 'percentage' | 'number' | 'currency'
): string {
  switch (type) {
    case 'time':
      return `${value.toFixed(1)}h`;
    case 'percentage':
      return `${value.toFixed(2)}%`;
    case 'currency':
      return `$${value.toLocaleString()}`;
    case 'number':
    default:
      return value.toLocaleString();
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function getColorForValue(
  value: number,
  thresholds: { min: number; max: number; colors: string[] }
): string {
  const { min, max, colors } = thresholds;
  const normalized = (value - min) / (max - min);
  const index = Math.min(Math.floor(normalized * colors.length), colors.length - 1);
  return colors[index];
}

export function generateGradientColors(
  startColor: string,
  endColor: string,
  steps: number
): string[] {
  const start = hexToRgb(startColor);
  const end = hexToRgb(endColor);

  if (!start || !end) return [];

  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(start.r + (end.r - start.r) * ratio);
    const g = Math.round(start.g + (end.g - start.g) * ratio);
    const b = Math.round(start.b + (end.b - start.b) * ratio);
    colors.push(rgbToHex(r, g, b));
  }

  return colors;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 1) return 'stable';
  return change > 0 ? 'up' : 'down';
}

export { formatCompactNumber as formatLargeNumber } from './format';

export function getResponsiveChartHeight(containerWidth: number): number {
  if (containerWidth < 640) return 200;
  if (containerWidth < 1024) return 280;
  return 320;
}

export function calculateChartMargins(containerWidth: number): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (containerWidth < 640) {
    return { top: 20, right: 20, bottom: 40, left: 50 };
  }
  if (containerWidth < 1024) {
    return { top: 30, right: 30, bottom: 50, left: 60 };
  }
  return { top: 40, right: 40, bottom: 60, left: 70 };
}
