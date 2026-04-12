import { Blockchain } from '@/types/oracle';

export const DIA_ASSET_ADDRESSES: Record<string, Partial<Record<Blockchain, string>>> = {
  DIA: {
    [Blockchain.ETHEREUM]: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
    [Blockchain.ARBITRUM]: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
    [Blockchain.POLYGON]: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
    [Blockchain.BASE]: '0x84cA8bc7997272c7CfB4D0Cd3D55cd942B3c9419',
  },
  ETH: {
    [Blockchain.ETHEREUM]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    [Blockchain.ARBITRUM]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    [Blockchain.OPTIMISM]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    [Blockchain.POLYGON]: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    [Blockchain.BASE]: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  },
  BTC: {
    [Blockchain.ETHEREUM]: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    [Blockchain.ARBITRUM]: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    [Blockchain.OPTIMISM]: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
  },
  USDC: {
    [Blockchain.ETHEREUM]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    [Blockchain.ARBITRUM]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    [Blockchain.OPTIMISM]: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    [Blockchain.POLYGON]: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    [Blockchain.AVALANCHE]: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    [Blockchain.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  USDT: {
    [Blockchain.ETHEREUM]: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    [Blockchain.ARBITRUM]: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    [Blockchain.OPTIMISM]: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    [Blockchain.POLYGON]: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  LINK: {
    [Blockchain.ETHEREUM]: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    [Blockchain.ARBITRUM]: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    [Blockchain.OPTIMISM]: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6',
    [Blockchain.POLYGON]: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
    [Blockchain.AVALANCHE]: '0x5947BB275c521040051D82396192181b413227A3',
    [Blockchain.BASE]: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196',
  },
};
