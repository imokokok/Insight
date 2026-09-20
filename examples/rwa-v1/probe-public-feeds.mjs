// Read-only diagnostic, public RPC only. Does not admit feeds or emit signed evidence.
import { readFileSync } from 'node:fs';

import { decodeFunctionResult, encodeFunctionData, parseAbi } from 'viem';

const config = readFileSync(
  new URL(
    '../../src/lib/oracles/services/chainlinkDataSources/priceFeedConfig.ts',
    import.meta.url
  ),
  'utf8'
);
const abi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)',
]);
const data = encodeFunctionData({ abi, functionName: 'latestRoundData' });
const observedAt = Math.floor(Date.now() / 1000);
const results = await Promise.all(
  ['AAPL', 'AMZN', 'TSLA', 'GOOGL', 'NVDA', 'COIN'].map(async (symbol) => {
    const address = config.match(
      new RegExp(symbol + ": \\{\\s*56: \\{\\s*address: '(0x[0-9a-fA-F]+)'")
    )?.[1];
    if (!address) return { symbol, status: 'NOT_CONFIGURED' };
    try {
      const response = await fetch('https://bsc-dataseed.bnbchain.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: address, data }, 'latest'],
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error('HTTP_' + response.status);
      const result = await response.json();
      if (result.error || !result.result || result.result === '0x')
        return { symbol, address, status: 'NO_USABLE_ROUND', rpcCode: result.error?.code ?? null };
      const [roundId, answer, , updatedAt, answeredInRound] = decodeFunctionResult({
        abi,
        functionName: 'latestRoundData',
        data: result.result,
      });
      return {
        symbol,
        address,
        status: answer > 0n && updatedAt > 0n ? 'ROUND_RETURNED' : 'INVALID_ROUND',
        answer: answer.toString(),
        updatedAt: updatedAt.toString(),
        ageSeconds: observedAt - Number(updatedAt),
        roundComplete: answeredInRound >= roundId,
      };
    } catch (error) {
      return { symbol, address, status: 'PROBE_UNAVAILABLE', reason: error.name ?? 'Error' };
    }
  })
);
// CLI stdout is the machine-readable probe artifact.
// eslint-disable-next-line no-console
console.log(
  JSON.stringify(
    {
      observedAt,
      network: 'BNB Chain',
      evidenceChainId: 56,
      mayAuthorizeExecution: false,
      warning:
        'A returned round is not stock-token identity, multi-source independence, a halt check, or production coverage. Weekend/closed sessions require explicit policy, not timestamp relaxation.',
      results,
    },
    null,
    2
  )
);
