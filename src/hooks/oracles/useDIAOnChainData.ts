'use client';

import { getDIADataService, type DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';

import { createOnChainDataHookFromService, type OnChainDataReturn } from './createOnChainDataHook';

export type UseDIAOnChainDataReturn = OnChainDataReturn<DIATokenOnChainData>;

export const useDIAOnChainData = createOnChainDataHookFromService<DIATokenOnChainData>('dia', () =>
  getDIADataService()
);
