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

import { OracleProvider } from '@/types/oracle';
import { PanelConfig } from './types';
import { chainlinkPanelConfig } from './ChainlinkPanelConfig';
import { pythPanelConfig } from './PythPanelConfig';
import { api3PanelConfig } from './API3PanelConfig';
import { tellorPanelConfig } from './TellorPanelConfig';
import { bandProtocolPanelConfig } from './BandProtocolPanelConfig';
import { umaPanelConfig } from './UMAPanelConfig';
import { diaPanelConfig } from './DIAPanelConfig';
import { chroniclePanelConfig } from './ChroniclePanelConfig';
import { redStonePanelConfig } from './RedStonePanelConfig';
import { winKLinkPanelConfig } from './WINkLinkPanelConfig';

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
