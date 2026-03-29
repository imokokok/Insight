/**
 * Safely divides two numbers, returning a fallback if denominator is zero
 * @param numerator - The numerator
 * @param denominator - The denominator
 * @param fallback - The fallback value if denominator is zero (default: 0)
 * @returns The result of division or fallback
 */
export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  return denominator === 0 ? fallback : numerator / denominator;
}

/**
 * Safely accesses an array element by index
 * @param array - The array to access
 * @param index - The index to access
 * @returns The element at the index or undefined if out of bounds
 */
export function safeArrayAccess<T>(array: T[], index: number): T | undefined {
  return array.at(index);
}

/**
 * Safely gets the last element of an array
 * @param array - The array to get the last element from
 * @returns The last element or undefined if array is empty
 */
export function safeGetLastElement<T>(array: T[]): T | undefined {
  return array.at(-1);
}

/**
 * Safely gets the first element of an array
 * @param array - The array to get the first element from
 * @returns The first element or undefined if array is empty
 */
export function safeGetFirstElement<T>(array: T[]): T | undefined {
  return array.at(0);
}
