'use client';

import { RedStoneClient, type RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';

import { createOnChainDataHookFromService } from './createOnChainDataHook';

export const useRedStoneOnChainData = createOnChainDataHookFromService<RedStoneTokenOnChainData>(
  'redstone',
  () => new RedStoneClient(),
  { ownsService: true }
);
