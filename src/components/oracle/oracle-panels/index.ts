import { OracleProvider } from '@/types/oracle';

import { api3PanelConfig } from './API3PanelConfig';
import { bandProtocolPanelConfig } from './BandProtocolPanelConfig';
import { chainlinkPanelConfig } from './ChainlinkPanelConfig';
import { chroniclePanelConfig } from './ChroniclePanelConfig';
import { diaPanelConfig } from './DIAPanelConfig';
import { pythPanelConfig } from './PythPanelConfig';
import { redStonePanelConfig } from './RedStonePanelConfig';
import { tellorPanelConfig } from './TellorPanelConfig';
import { type PanelConfig } from './types';
import { umaPanelConfig } from './UMAPanelConfig';
import { winKLinkPanelConfig } from './WINkLinkPanelConfig';

export * from './types';
export { chainlinkPanelConfig } from './ChainlinkPanelConfig';
export { pythPanelConfig } from './PythPanelConfig';
export { api3PanelConfig } from './API3PanelConfig';
export { tellorPanelConfig } from './TellorPanelConfig';
export { bandProtocolPanelConfig } from './BandProtocolPanelConfig';
export { umaPanelConfig } from './UMAPanelConfig';
export { diaPanelConfig } from './DIAPanelConfig';
export { chroniclePanelConfig } from './ChroniclePanelConfig';
export { redStonePanelConfig } from './RedStonePanelConfig';
export { winKLinkPanelConfig } from './WINkLinkPanelConfig';

export const getPanelConfig = (provider: OracleProvider): PanelConfig => {
  switch (provider) {
    case OracleProvider.CHAINLINK:
      return chainlinkPanelConfig;
    case OracleProvider.PYTH:
      return pythPanelConfig;
    case OracleProvider.API3:
      return api3PanelConfig;
    case OracleProvider.TELLOR:
      return tellorPanelConfig;
    case OracleProvider.BAND_PROTOCOL:
      return bandProtocolPanelConfig;
    case OracleProvider.UMA:
      return umaPanelConfig;
    case OracleProvider.DIA:
      return diaPanelConfig;
    case OracleProvider.CHRONICLE:
      return chroniclePanelConfig;
    case OracleProvider.REDSTONE:
      return redStonePanelConfig;
    case OracleProvider.WINKLINK:
      return winKLinkPanelConfig;
    default:
      return chainlinkPanelConfig;
  }
};
