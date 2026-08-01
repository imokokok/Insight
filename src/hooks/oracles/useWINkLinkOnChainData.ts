'use client';

import {
  getWINkLinkRealDataService,
  type WINkLinkTokenOnChainData,
} from '@/lib/oracles/services/winklinkRealDataService';

import { createOnChainDataHookFromService } from './createOnChainDataHook';

export const useWINkLinkOnChainData = createOnChainDataHookFromService<WINkLinkTokenOnChainData>(
  'winklink',
  () => getWINkLinkRealDataService()
);
