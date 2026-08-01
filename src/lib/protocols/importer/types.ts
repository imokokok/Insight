export interface ImportedAssetEntry {
  symbol: string;
  amount: number;
  valueUsd?: number;
  decimals?: number;
  underlyingAsset?: `0x${string}`;
}

export interface SkippedAssetEntry {
  underlyingAsset: `0x${string}`;
  symbol: string;
  reason: 'unsupported' | 'unknown_reserve';
}

export interface ImportedPosition {
  address: `0x${string}`;
  protocolId: string;
  collaterals: ImportedAssetEntry[];
  borrows: ImportedAssetEntry[];
  skippedAssets: SkippedAssetEntry[];
  rawPositions: unknown[];
  importedAt: number;
}
