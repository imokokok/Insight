/* eslint-disable no-console */
import { fetchAlpacaStockQuotes, type AlpacaStockFeed } from '@/lib/marketReference/alpaca';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Alpaca development check is disabled when NODE_ENV=production');
  }

  const symbols = (process.env.ALPACA_DEV_TEST_STOCK_SYMBOLS ?? 'AAPL')
    .split(',')
    .map((symbol) => symbol.trim())
    .filter(Boolean);
  const feed = (process.env.ALPACA_DEV_TEST_STOCK_FEED ?? 'iex') as AlpacaStockFeed;
  const quotes = await fetchAlpacaStockQuotes({
    apiKeyId: process.env.APCA_API_KEY_ID ?? '',
    apiSecretKey: process.env.APCA_API_SECRET_KEY ?? '',
    symbols,
    feed,
  });

  console.log(
    JSON.stringify(
      {
        mode: 'DEV_TEST_ONLY',
        persisted: false,
        published: false,
        provider: 'alpaca',
        quotes,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[alpaca-dev-test] ${message}`);
  process.exitCode = 1;
});
