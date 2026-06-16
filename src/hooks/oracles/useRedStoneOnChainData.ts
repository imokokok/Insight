'use client';

import { RedStoneClient, type RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';

import { createOnChainDataHookFromService, type OnChainDataReturn } from './createOnChainDataHook';

export type UseRedStoneOnChainDataReturn = OnChainDataReturn<RedStoneTokenOnChainData>;

export const useRedStoneOnChainData = createOnChainDataHookFromService<RedStoneTokenOnChainData>(
  'redstone',
  () => new RedStoneClient()
);
