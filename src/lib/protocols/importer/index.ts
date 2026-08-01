import { ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

import { importAaveV3Position } from './aaveV3Importer';

import type { ImportedPosition } from './types';
import type { ProtocolConfig } from '../protocolRegistry';

export type { ImportedPosition } from './types';

const logger = createLogger('position-importer');

export async function importPosition(
  protocol: ProtocolConfig,
  address: `0x${string}`
): Promise<ImportedPosition> {
  if (protocol.id.startsWith('aave-v3')) {
    return importAaveV3Position(protocol, address);
  }

  logger.warn(`On-chain import not implemented for protocol ${protocol.id}`);
  throw new ValidationError(`On-chain import is not supported for ${protocol.name}`, {
    details: { protocolId: protocol.id },
  });
}
