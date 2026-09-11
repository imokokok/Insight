export function isDomainOrSubdomain(url: string, domain: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const normalizedDomain = domain.toLowerCase();
    return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
  } catch {
    return false;
  }
}
