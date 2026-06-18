'use client';

import { FlareClient, type FlareTokenOnChainData } from '@/lib/oracles/clients/flare';

import { createOnChainDataHookFromService } from './createOnChainDataHook';

export const useFlareOnChainData = createOnChainDataHookFromService<FlareTokenOnChainData>(
  'flare',
  () => new FlareClient()
);
