'use client';

import {
  getWINkLinkRealDataService,
  type WINkLinkTokenOnChainData,
} from '@/lib/oracles/services/winklinkRealDataService';

import { createOnChainDataHook, type OnChainDataReturn } from './createOnChainDataHook';

export type UseWINkLinkOnChainDataReturn = OnChainDataReturn<WINkLinkTokenOnChainData>;

export const useWINkLinkOnChainData = createOnChainDataHook<WINkLinkTokenOnChainData>(
  'winklink',
  () => getWINkLinkRealDataService()
);
