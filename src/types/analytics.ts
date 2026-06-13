export interface PriceStats {
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviationPercent: number;
}

export interface ExtendedPriceStats extends PriceStats {
  medianPrice: number;
  weightedAvgPrice: number;
  variance: number;
  standardDeviation: number;
  validPrices: number[];
}

export interface UserPreferences {
  default_oracle?: string;
  default_symbol?: string;
  default_chain?: string;
  default_time_range?: string;
  default_currency?: string;
  auto_refresh_interval?: number;
  chart_settings?: {
    show_confidence_interval?: boolean;
    auto_refresh?: boolean;
    refresh_interval?: number;
  };
}

export interface UserNotificationSettings {
  push_notifications?: boolean;
}

export interface UserProfile {
  id: string;
  email?: string;
  display_name: string | null;
  avatar_url?: string | null;
  preferences?: UserPreferences;
  notification_settings?: UserNotificationSettings;
  created_at?: string | Date;
  updated_at?: string | Date;
}
