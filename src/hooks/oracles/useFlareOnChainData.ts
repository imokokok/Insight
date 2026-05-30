'use client';

import { FlareClient, type FlareTokenOnChainData } from '@/lib/oracles/clients/flare';

import { createOnChainDataHook, type OnChainDataReturn } from './createOnChainDataHook';

export type UseFlareOnChainDataReturn = OnChainDataReturn<FlareTokenOnChainData>;

export const useFlareOnChainData = createOnChainDataHook<FlareTokenOnChainData>(
  'flare',
  () => new FlareClient()
);
