const ALLOWED_REDIRECT_PATHS = [
  '/',
  '/settings',
  '/price-query',
  '/price-insight',
  '/api',
  '/pricing',
  '/mcp',
  '/ai',
];

/**
 * Validate a post-auth redirect path.
 *
 * Only allows same-origin relative paths that are known app routes. Query
 * strings are ignored when checking the path root, so `/settings?tab=billing`
 * is accepted because `/settings` is in the allowlist.
 */
export function isValidRedirectPath(path: string | null | undefined): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  if (path.startsWith('//') || path.startsWith('http://') || path.startsWith('https://')) {
    return false;
  }

  const pathWithoutQuery = path.split('?')[0];
  return ALLOWED_REDIRECT_PATHS.some(
    (allowed) => pathWithoutQuery === allowed || pathWithoutQuery.startsWith(allowed + '/')
  );
}
