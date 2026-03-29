export type StatusLevel = 'low' | 'medium' | 'high' | 'critical';
export type TransactionStatus = 'success' | 'pending' | 'failed';
export type VRFRequestStatus = 'fulfilled' | 'pending' | 'failed';

/**
 * Gets the text color class for a risk level
 * @param level - The risk level
 * @returns Tailwind CSS text color class
 */
export function getRiskColor(level: StatusLevel): string {
  switch (level) {
    case 'low': return 'text-emerald-600';
    case 'medium': return 'text-amber-600';
    case 'high': return 'text-red-600';
    case 'critical': return 'text-red-700';
    default: return 'text-gray-600';
  }
}

/**
 * Gets the background color class for a risk level
 * @param level - The risk level
 * @returns Tailwind CSS background color class
 */
export function getRiskBgColor(level: StatusLevel): string {
  switch (level) {
    case 'low': return 'bg-emerald-50';
    case 'medium': return 'bg-amber-50';
    case 'high': return 'bg-red-50';
    case 'critical': return 'bg-red-100';
    default: return 'bg-gray-50';
  }
}

/**
 * Gets the combined text and background color classes for a transaction status
 * @param status - The transaction status
 * @returns Tailwind CSS classes for text and background colors
 */
export function getTransactionStatusColor(status: TransactionStatus): string {
  switch (status) {
    case 'success': return 'text-emerald-600 bg-emerald-50';
    case 'pending': return 'text-amber-600 bg-amber-50';
    case 'failed': return 'text-red-600 bg-red-50';
  }
}

/**
 * Gets the combined text and background color classes for a VRF request status
 * @param status - The VRF request status
 * @returns Tailwind CSS classes for text and background colors
 */
export function getVRFStatusColor(status: VRFRequestStatus): string {
  switch (status) {
    case 'fulfilled': return 'text-emerald-600 bg-emerald-50';
    case 'pending': return 'text-amber-600 bg-amber-50';
    case 'failed': return 'text-red-600 bg-red-50';
  }
}
