import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export { safeMax, safeMin } from './utils/statistics';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
