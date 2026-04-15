export enum OracleProvider {
  CHAINLINK = 'chainlink',
  PYTH = 'pyth',
  API3 = 'api3',
  REDSTONE = 'redstone',
  DIA = 'dia',
  WINKLINK = 'winklink',
  SUPRA = 'supra',
}

export enum Blockchain {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  SOLANA = 'solana',
  AVALANCHE = 'avalanche',
  FANTOM = 'fantom',
  CRONOS = 'cronos',
  JUNO = 'juno',
  COSMOS = 'cosmos',
  OSMOSIS = 'osmosis',
  BNB_CHAIN = 'bnb-chain',
  BASE = 'base',
  SCROLL = 'scroll',
  ZKSYNC = 'zksync',
  APTOS = 'aptos',
  SUI = 'sui',
  GNOSIS = 'gnosis',
  MANTLE = 'mantle',
  LINEA = 'linea',
  CELESTIA = 'celestia',
  INJECTIVE = 'injective',
  SEI = 'sei',
  TRON = 'tron',
  TON = 'ton',
  NEAR = 'near',
  AURORA = 'aurora',
  CELO = 'celo',
  STARKNET = 'starknet',
  BLAST = 'blast',
  CARDANO = 'cardano',
  POLKADOT = 'polkadot',
  KAVA = 'kava',
  MOONBEAM = 'moonbeam',
  MOONRIVER = 'moonriver',
  METIS = 'metis',
  STARKEX = 'starkex',
}

export const BINANCE = Blockchain.BNB_CHAIN;

export const ORACLE_PROVIDER_VALUES: readonly OracleProvider[] = Object.values(OracleProvider);

export const BLOCKCHAIN_VALUES: readonly Blockchain[] = Object.values(Blockchain);
