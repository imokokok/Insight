'use client';

import { FlareClient, type FlareTokenOnChainData } from '@/lib/oracles/clients/flare';

import { createOnChainDataHookFromService, type OnChainDataReturn } from './createOnChainDataHook';

export type UseFlareOnChainDataReturn = OnChainDataReturn<FlareTokenOnChainData>;

export const useFlareOnChainData = createOnChainDataHookFromService<FlareTokenOnChainData>(
  'flare',
  () => new FlareClient()
);
