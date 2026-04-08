/**
 * 预言机颜色工具函数
 * 避免与 colors.ts 的循环依赖
 */

import { chartColors } from '@/lib/config/colors';
import { OracleProvider } from '@/types/oracle';

/**
 * 获取预言机颜色
 */
export function getOracleColor(provider: OracleProvider): string {
  const colorMap: Record<OracleProvider, string> = {
    [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
    [OracleProvider.BAND_PROTOCOL]: chartColors.oracle['band-protocol'],
    [OracleProvider.UMA]: chartColors.oracle.uma,
    [OracleProvider.PYTH]: chartColors.oracle['pyth'],
    [OracleProvider.API3]: chartColors.oracle.api3,
    [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
    [OracleProvider.DIA]: chartColors.oracle.dia,
    [OracleProvider.WINKLINK]: chartColors.oracle.winklink,
  };
  return colorMap[provider] || chartColors.sequence[0];
}
