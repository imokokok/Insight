'use client';

import { getDIADataService, type DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';

import { createOnChainDataHook, type OnChainDataReturn } from './createOnChainDataHook';

export type UseDIAOnChainDataReturn = OnChainDataReturn<DIATokenOnChainData>;

export const useDIAOnChainData = createOnChainDataHook<DIATokenOnChainData>('dia', () =>
  getDIADataService()
);
