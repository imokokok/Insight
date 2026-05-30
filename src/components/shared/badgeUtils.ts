export interface BadgeStyle {
  label: string;
  bgClass: string;
  textClass: string;
}

export function createBadgeMapper<T extends string>(
  mapping: Record<T, BadgeStyle>,
  fallback: BadgeStyle
): (key: T | string) => BadgeStyle {
  return (key) => mapping[key as T] ?? fallback;
}
