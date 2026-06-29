import { PROTOCOL_REGISTRY, deriveDeviationRatios } from '@/lib/protocols/protocolRegistry';

function main() {
  for (const protocol of PROTOCOL_REGISTRY) {
    const ratios = deriveDeviationRatios(protocol);
    console.log(`\n${protocol.name} (${protocol.id})`);
    for (const asset of protocol.assets) {
      const ltPercent = ((1 / asset.liquidationThreshold) * 100).toFixed(1);
      console.log(
        `  ${asset.symbol.padEnd(8)} ${asset.category.padEnd(10)} LT=${ltPercent}%  ratio=${ratios[asset.symbol]}`
      );
    }
  }
}

main();
