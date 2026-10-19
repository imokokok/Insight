import { permanentRedirect } from 'next/navigation';

import PriceQueryPage from '../page';

jest.mock('next/navigation', () => ({
  permanentRedirect: jest.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

describe('PriceQueryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(permanentRedirect).mockImplementation((destination: string): never => {
      throw new Error(`redirect:${destination}`);
    });
  });

  it('permanently redirects legacy source-record links without dropping their parameters', async () => {
    await expect(
      PriceQueryPage({
        searchParams: Promise.resolve({
          symbol: 'BTC',
          oracles: 'chainlink',
          chains: 'ethereum',
        }),
      })
    ).rejects.toThrow(
      'redirect:/price-insight?symbol=BTC&oracles=chainlink&chains=ethereum&stage=observe'
    );

    expect(permanentRedirect).toHaveBeenCalledWith(
      '/price-insight?symbol=BTC&oracles=chainlink&chains=ethereum&stage=observe'
    );
  });

  it('preserves repeated legacy query parameters', async () => {
    await expect(
      PriceQueryPage({ searchParams: Promise.resolve({ provider: ['chainlink', 'dia'] }) })
    ).rejects.toThrow('redirect:/price-insight?provider=chainlink&provider=dia&stage=observe');
  });
});
