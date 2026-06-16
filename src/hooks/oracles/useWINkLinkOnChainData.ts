'use client';

import {
  getWINkLinkRealDataService,
  type WINkLinkTokenOnChainData,
} from '@/lib/oracles/services/winklinkRealDataService';

import { createOnChainDataHookFromService, type OnChainDataReturn } from './createOnChainDataHook';

export type UseWINkLinkOnChainDataReturn = OnChainDataReturn<WINkLinkTokenOnChainData>;

export const useWINkLinkOnChainData = createOnChainDataHookFromService<WINkLinkTokenOnChainData>(
  'winklink',
  () => getWINkLinkRealDataService()
);
