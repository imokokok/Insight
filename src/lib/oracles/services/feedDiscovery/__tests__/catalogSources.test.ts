import {
  parseChainlinkAddressPage,
  parseChainlinkDirectory,
  parseSupraPairPage,
} from '../catalogSources';

describe('official oracle catalogue parsers', () => {
  it('keeps direct Chainlink USD price feeds and rejects non-price/cross-rate rows', () => {
    const feeds = parseChainlinkDirectory(
      [
        {
          proxyAddress: '0x1111111111111111111111111111111111111111',
          decimals: 8,
          heartbeat: 3600,
          path: 'btc-usd',
          docs: { baseAsset: 'BTC', quoteAsset: 'USD', productType: 'Price' },
        },
        {
          proxyAddress: '0x2222222222222222222222222222222222222222',
          docs: { baseAsset: 'ETH', quoteAsset: 'BTC', productType: 'Price' },
        },
        {
          proxyAddress: '0x3333333333333333333333333333333333333333',
          docs: { baseAsset: 'GDP', quoteAsset: 'USD', productType: 'Economic Data' },
        },
      ],
      1,
      'test'
    );

    expect(feeds).toHaveLength(1);
    expect(feeds[0]).toMatchObject({ symbol: 'BTC', chain_id: 1, decimals: 8 });
    expect(feeds[0].metadata).toMatchObject({ heartbeat: 3600, candidatePriority: 0 });
  });

  it('decodes the tagged metadata embedded in the Chainlink address page', () => {
    const address = '0x1111111111111111111111111111111111111111';
    const html =
      '&quot;rddUrl&quot;:[0,&quot;https://reference-data-directory.vercel.app/feeds-mainnet.json&quot;],' +
      '&quot;metadata&quot;:[1,[[0,{&quot;proxyAddress&quot;:[0,&quot;' +
      address +
      '&quot;],&quot;decimals&quot;:[0,8],&quot;path&quot;:[0,&quot;eth-usd&quot;],&quot;docs&quot;:[0,{&quot;baseAsset&quot;:[0,&quot;ETH&quot;],&quot;quoteAsset&quot;:[0,&quot;USD&quot;],&quot;productType&quot;:[0,&quot;Price&quot;]}]}]]]]';

    expect(parseChainlinkAddressPage(html)).toEqual([
      expect.objectContaining({ symbol: 'ETH', chain_id: 1, address }),
    ]);
  });

  it('uses active USD-equivalent Supra rows and prefers USD over USDT', () => {
    const html = `
      <table>
        <tr><td>BTC_USDT</td><td>0</td><td>Cryptocurrency</td></tr>
        <tr><td>BTC_USD</td><td>18</td><td>Cryptocurrency</td></tr>
        <tr><td>ETH_USD (Deprecated)</td><td>1</td><td>Deprecated</td></tr>
        <tr><td>EUR_USD</td><td>500</td><td>Forex</td></tr>
        <tr><td>ETH_BTC</td><td>99</td><td>Cryptocurrency</td></tr>
      </table>`;

    expect(parseSupraPairPage(html)).toEqual([
      { symbol: 'BTC', pairIndex: 18, pair: 'BTC_USD', quote: 'USD', category: 'Cryptocurrency' },
      { symbol: 'EUR', pairIndex: 500, pair: 'EUR_USD', quote: 'USD', category: 'Forex' },
    ]);
  });
});
