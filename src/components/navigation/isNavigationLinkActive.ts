import { type NavItem } from './types';

/**
 * Determines whether a navigation target represents the current location.
 *
 * `usePathname` deliberately excludes the query string, but several primary
 * Insight destinations use it to select a distinct workflow stage. Matching
 * the route and the target's declared query parameters keeps those entries
 * honest without requiring unrelated current query parameters to match.
 */
export function isNavigationLinkActive(
  href: string,
  currentPath: string,
  currentSearch = ''
): boolean {
  const [targetPath, targetQuery = ''] = href.split('?');
  const pathMatches = currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

  if (!pathMatches) return false;
  if (!targetQuery) return true;

  const targetParams = new URLSearchParams(targetQuery);
  const currentParams = new URLSearchParams(currentSearch);

  return Array.from(targetParams.entries()).every(
    ([key, value]) => currentParams.get(key) === value
  );
}

export function isNavigationGroupActive(
  items: NavItem[],
  currentPath: string,
  currentSearch = ''
): boolean {
  return items.some((item) => isNavigationLinkActive(item.href, currentPath, currentSearch));
}
