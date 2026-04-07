/**
 * 生成Tellor Query ID
 *
 * Query ID = keccak256(queryData)
 * queryData = abi.encode("SpotPrice", abi.encode("btc", "usd"))
 */

import { keccak256, encodeAbiParameters, parseAbiParameters, stringToHex } from 'viem';

function generateSpotPriceQueryId(asset: string, currency: string): string {
  // SpotPrice query data structure:
  // abi.encode("SpotPrice", abi.encode(asset, currency))

  // First, encode the inner parameters (asset, currency)
  const innerEncoded = encodeAbiParameters(parseAbiParameters('string, string'), [asset, currency]);

  // Then encode the outer structure with "SpotPrice"
  const queryData = encodeAbiParameters(parseAbiParameters('string, bytes'), [
    'SpotPrice',
    innerEncoded,
  ]);

  // Generate queryId using keccak256
  const queryId = keccak256(queryData);

  return queryId;
}

function main() {
  console.log('=== Tellor Query ID 生成器 ===\n');

  // 生成BTC/USD的Query ID
  const btcQueryId = generateSpotPriceQueryId('btc', 'usd');
  console.log('BTC/USD SpotPrice:');
  console.log(`  Query ID: ${btcQueryId}`);
  console.log(
    `  当前代码中的Query ID: 0xa6f013ee236804827b77696d350e9f0ac3e879328f2a3021d473a0b778ad78ac`
  );
  console.log(
    `  是否匹配: ${btcQueryId.toLowerCase() === '0xa6f013ee236804827b77696d350e9f0ac3e879328f2a3021d473a0b778ad78ac'}`
  );

  console.log('\n');

  // 生成ETH/USD的Query ID
  const ethQueryId = generateSpotPriceQueryId('eth', 'usd');
  console.log('ETH/USD SpotPrice:');
  console.log(`  Query ID: ${ethQueryId}`);
  console.log(
    `  当前代码中的Query ID: 0x83a7f3d48786ac2667503a61e8c415438ed2922eb86a2906e4ee66d9bb2cb49a`
  );
  console.log(
    `  是否匹配: ${ethQueryId.toLowerCase() === '0x83a7f3d48786ac2667503a61e8c415438ed2922eb86a2906e4ee66d9bb2cb49a'}`
  );

  console.log('\n');

  // 生成LINK/USD的Query ID
  const linkQueryId = generateSpotPriceQueryId('link', 'usd');
  console.log('LINK/USD SpotPrice:');
  console.log(`  Query ID: ${linkQueryId}`);
  console.log(
    `  当前代码中的Query ID: 0x5c13cd9c97dbb98f2429c101a2a8150e6c7a0ddaff6124ee176a3a411067ded0`
  );
  console.log(
    `  是否匹配: ${linkQueryId.toLowerCase() === '0x5c13cd9c97dbb98f2429c101a2a8150e6c7a0ddaff6124ee176a3a411067ded0'}`
  );

  console.log('\n');

  // 生成TRB/USD的Query ID
  const trbQueryId = generateSpotPriceQueryId('trb', 'usd');
  console.log('TRB/USD SpotPrice:');
  console.log(`  Query ID: ${trbQueryId}`);
  console.log(
    `  当前代码中的Query ID: 0x5c13cd9c97dbb98f2429c101a2a8150e6c7a0ddaff6124ee176a3a411067ded0`
  );
  console.log(
    `  是否匹配: ${trbQueryId.toLowerCase() === '0x5c13cd9c97dbb98f2429c101a2a8150e6c7a0ddaff6124ee176a3a411067ded0'}`
  );
  console.log(`  ⚠️ 注意: LINK和TRB使用了相同的Query ID，这可能是一个错误！`);
}

main();
