export function getAppUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Both branches must return a trailing-slash-free origin. Callers concatenate
  // `getAppUrl() + '/path'`, so an env value with a trailing slash (e.g.
  // "https://oracleinsight.xyz/") would otherwise yield a double slash
  // ("https://oracleinsight.xyz//path"), breaking URLs such as billing redirect
  // callbacks. Trim first so a stray space in the env value can't slip through.
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
  return configured.replace(/\/+$/, '') || 'https://oracleinsight.xyz';
}
