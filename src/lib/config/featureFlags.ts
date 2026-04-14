export interface FeatureFlags {
  useRealChainlinkData: boolean;
  useRealApi3Data: boolean;
  useRealWinklinkData: boolean;
}

function getFeatureFlagDefault(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return value === 'true';
}

export const FEATURE_FLAGS: FeatureFlags = {
  useRealChainlinkData: getFeatureFlagDefault(process.env.USE_REAL_CHAINLINK_DATA, true),
  useRealApi3Data: getFeatureFlagDefault(process.env.USE_REAL_API3_DATA, true),
  useRealWinklinkData: getFeatureFlagDefault(process.env.USE_REAL_WINKLINK_DATA, true),
};

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return FEATURE_FLAGS[flag];
}
