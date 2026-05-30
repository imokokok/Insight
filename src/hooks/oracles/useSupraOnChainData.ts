'use client';

import { SupraClient, type SupraTokenOnChainData } from '@/lib/oracles/clients/supra';

import { createOnChainDataHook, type OnChainDataReturn } from './createOnChainDataHook';

export type UseSupraOnChainDataReturn = OnChainDataReturn<SupraTokenOnChainData>;

export const useSupraOnChainData = createOnChainDataHook<SupraTokenOnChainData>(
  'supra',
  () => new SupraClient()
);
