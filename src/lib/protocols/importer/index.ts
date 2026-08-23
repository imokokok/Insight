import { ValidationError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

import { importAaveV3Position } from './aaveV3Importer';
import { importCompoundV2Position } from './compoundV2Importer';
import { importCompoundV3Position } from './compoundV3Importer';
import { importMorphoBluePosition } from './morphoBlueImporter';

import type { ImportedPosition } from './types';
import type { ProtocolConfig } from '../protocolRegistry';

export type { ImportedPosition } from './types';

const logger = createLogger('position-importer');

/**
 * Dispatch an on-chain position import based on which contract addresses the
 * protocol registry exposes. Each lending protocol family wires up a different
 * on-chain reader:
 *  - poolDataProvider  → Aave V3 (and Aave-V3 forks such as Spark)
 *  - comet             → Compound V3
 *  - comptroller       → Compound V2 forks (Venus, BENQI)
 *  - morpho            → Morpho Blue
 */
export async function importPosition(
  protocol: ProtocolConfig,
  address: `0x${string}`
): Promise<ImportedPosition> {
  const contracts = protocol.contracts;

  if (contracts?.poolDataProvider) {
    return importAaveV3Position(protocol, address);
  }
  if (contracts?.comet) {
    return importCompoundV3Position(protocol, address);
  }
  if (contracts?.comptroller) {
    return importCompoundV2Position(protocol, address);
  }
  if (contracts?.morpho) {
    return importMorphoBluePosition(protocol, address);
  }

  logger.warn(`On-chain import not implemented for protocol ${protocol.id}`);
  throw new ValidationError(`On-chain import is not supported for ${protocol.name}`, {
    details: { protocolId: protocol.id },
  });
}
