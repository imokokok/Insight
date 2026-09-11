import { isDomainOrSubdomain } from '../urlHost';

describe('isDomainOrSubdomain', () => {
  it('matches the exact domain and real subdomains', () => {
    expect(isDomainOrSubdomain('https://alchemy.com/v2/key', 'alchemy.com')).toBe(true);
    expect(isDomainOrSubdomain('https://eth-mainnet.g.alchemy.com/v2/key', 'alchemy.com')).toBe(
      true
    );
  });

  it('does not match lookalike hosts or domain text outside the hostname', () => {
    expect(isDomainOrSubdomain('https://alchemy.com.evil.example/v2/key', 'alchemy.com')).toBe(
      false
    );
    expect(isDomainOrSubdomain('https://evil.example/alchemy.com', 'alchemy.com')).toBe(false);
    expect(isDomainOrSubdomain('not a URL containing alchemy.com', 'alchemy.com')).toBe(false);
  });
});
