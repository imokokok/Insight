'use client';

import { getDIADataService, type DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';

import { createOnChainDataHookFromService } from './createOnChainDataHook';

export const useDIAOnChainData = createOnChainDataHookFromService<DIATokenOnChainData>('dia', () =>
  getDIADataService()
);
