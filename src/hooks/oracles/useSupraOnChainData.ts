'use client';

import { SupraClient, type SupraTokenOnChainData } from '@/lib/oracles/clients/supra';

import { createOnChainDataHookFromService, type OnChainDataReturn } from './createOnChainDataHook';

export type UseSupraOnChainDataReturn = OnChainDataReturn<SupraTokenOnChainData>;

export const useSupraOnChainData = createOnChainDataHookFromService<SupraTokenOnChainData>(
  'supra',
  () => new SupraClient()
);
