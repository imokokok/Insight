import { Blockchain } from '@/types/oracle';

export const NFT_COLLECTIONS: Array<{
  address: string;
  name: string;
  symbol: string;
  chain: Blockchain;
}> = [
  {
    address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    name: 'Bored Ape Yacht Club',
    symbol: 'BAYC',
    chain: Blockchain.ETHEREUM,
  },
  {
    address: '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB',
    name: 'CryptoPunks',
    symbol: 'PUNK',
    chain: Blockchain.ETHEREUM,
  },
  {
    address: '0xED5AF388653567Af2F388E6224dC7C4b3241C544',
    name: 'Azuki',
    symbol: 'AZUKI',
    chain: Blockchain.ETHEREUM,
  },
  {
    address: '0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e',
    name: 'Doodles',
    symbol: 'DOODLE',
    chain: Blockchain.ETHEREUM,
  },
  {
    address: '0x49cF6f5d44E70224e2E23fDcdd2C053F30aDA28B',
    name: 'CloneX',
    symbol: 'CLONEX',
    chain: Blockchain.ETHEREUM,
  },
  {
    address: '0xBd3531dA5CF5857e7CfAA92426877b022e612cf8',
    name: 'Pudgy Penguins',
    symbol: 'PPG',
    chain: Blockchain.ETHEREUM,
  },
];
