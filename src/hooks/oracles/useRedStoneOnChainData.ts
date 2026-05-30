'use client';

import { RedStoneClient, type RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';

import { createOnChainDataHook, type OnChainDataReturn } from './createOnChainDataHook';

export type UseRedStoneOnChainDataReturn = OnChainDataReturn<RedStoneTokenOnChainData>;

export const useRedStoneOnChainData = createOnChainDataHook<RedStoneTokenOnChainData>(
  'redstone',
  () => new RedStoneClient()
);
