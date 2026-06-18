'use client';

import { SupraClient, type SupraTokenOnChainData } from '@/lib/oracles/clients/supra';

import { createOnChainDataHookFromService } from './createOnChainDataHook';

export const useSupraOnChainData = createOnChainDataHookFromService<SupraTokenOnChainData>(
  'supra',
  () => new SupraClient()
);
