export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          preferences: Json;
          notification_settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          preferences?: Json;
          notification_settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          preferences?: Json;
          notification_settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      price_records: {
        Row: {
          id: string;
          provider: string;
          symbol: string;
          chain: string | null;
          price: number;
          timestamp: string;
          confidence: number | null;
          source: string | null;
          created_at: string;
          ttl: string;
        };
        Insert: {
          id?: string;
          provider: string;
          symbol: string;
          chain?: string | null;
          price: number;
          timestamp: string;
          confidence?: number | null;
          source?: string | null;
          created_at?: string;
          ttl: string;
        };
        Update: {
          id?: string;
          provider?: string;
          symbol?: string;
          chain?: string | null;
          price?: number;
          timestamp?: string;
          confidence?: number | null;
          source?: string | null;
          created_at?: string;
          ttl?: string;
        };
        Relationships: [];
      };
      user_snapshots: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          name: string | null;
          selected_oracles: string[];
          price_data: Json;
          stats: Json;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          name?: string | null;
          selected_oracles: string[];
          price_data: Json;
          stats: Json;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          name?: string | null;
          selected_oracles?: string[];
          price_data?: Json;
          stats?: Json;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_snapshots_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_favorites: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          config_type: 'oracle_config' | 'symbol' | 'chain_config';
          config_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          config_type: 'oracle_config' | 'symbol' | 'chain_config';
          config_data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          config_type?: 'oracle_config' | 'symbol' | 'chain_config';
          config_data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_favorites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      price_alerts: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          provider: string | null;
          chain: string | null;
          condition_type: 'above' | 'below' | 'change_percent';
          target_value: number;
          is_active: boolean;
          last_triggered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          provider?: string | null;
          chain?: string | null;
          condition_type: 'above' | 'below' | 'change_percent';
          target_value: number;
          is_active?: boolean;
          last_triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          provider?: string | null;
          chain?: string | null;
          condition_type?: 'above' | 'below' | 'change_percent';
          target_value?: number;
          is_active?: boolean;
          last_triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'price_alerts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      alert_events: {
        Row: {
          id: string;
          alert_id: string;
          user_id: string;
          triggered_at: string;
          price: number;
          condition_met: string;
          acknowledged: boolean;
          acknowledged_at: string | null;
        };
        Insert: {
          id?: string;
          alert_id: string;
          user_id: string;
          triggered_at?: string;
          price: number;
          condition_met: string;
          acknowledged?: boolean;
          acknowledged_at?: string | null;
        };
        Update: {
          id?: string;
          alert_id?: string;
          user_id?: string;
          triggered_at?: string;
          price?: number;
          condition_met?: string;
          acknowledged?: boolean;
          acknowledged_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'alert_events_alert_id_fkey';
            columns: ['alert_id'];
            isOneToOne: false;
            referencedRelation: 'price_alerts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alert_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      active_alerts_with_prices: {
        Row: {
          alert_id: string;
          user_id: string;
          symbol: string;
          provider: string | null;
          chain: string | null;
          condition_type: string;
          target_value: number;
          is_active: boolean;
          last_triggered_at: string | null;
          current_price: number | null;
          price_timestamp: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'price_alerts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      cleanup_expired_price_records: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      get_latest_price: {
        Args: {
          p_provider: string;
          p_symbol: string;
          p_chain?: string | null;
        };
        Returns: {
          id: string;
          provider: string;
          symbol: string;
          chain: string | null;
          price: number;
          timestamp: string;
          confidence: number | null;
          source: string | null;
        }[];
      };
      get_price_history: {
        Args: {
          p_provider: string;
          p_symbol: string;
          p_start_time: string;
          p_end_time: string;
          p_chain?: string | null;
          p_limit?: number;
        };
        Returns: {
          id: string;
          provider: string;
          symbol: string;
          chain: string | null;
          price: number;
          timestamp: string;
          confidence: number | null;
          source: string | null;
        }[];
      };
      handle_new_user: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      update_updated_at_column: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];

export type UserProfile = Tables<'user_profiles'>;
export type PriceRecord = Tables<'price_records'>;
export type UserSnapshot = Tables<'user_snapshots'>;
export type UserFavorite = Tables<'user_favorites'>;
export type PriceAlert = Tables<'price_alerts'>;
export type AlertEvent = Tables<'alert_events'>;
export type ActiveAlertWithPrice = Views<'active_alerts_with_prices'>;

export type UserPreferences = {
  default_oracle?: string;
  default_symbol?: string;
  default_chain?: string;
  language?: string;
  default_currency?: string;
  auto_refresh_interval?: number;
  chart_settings?: {
    show_confidence_interval?: boolean;
    auto_refresh?: boolean;
    refresh_interval?: number;
  };
};

export type NotificationSettings = {
  email_alerts?: boolean;
  push_notifications?: boolean;
  alert_frequency?: 'immediate' | 'hourly' | 'daily';
};

export type SnapshotStats = {
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
};

export type SnapshotPriceData = {
  provider: string;
  symbol: string;
  chain?: string;
  price: number;
  timestamp: number;
  confidence?: number;
  source?: string;
};

export type OracleConfigFavorite = {
  selectedOracles: string[];
  symbol: string;
};

export type SymbolFavorite = {
  symbol: string;
  chains?: string[];
};

export type ChainConfigFavorite = {
  chain: string;
  symbols?: string[];
};

export type AlertConditionType = 'above' | 'below' | 'change_percent';

export type ConfigType = 'oracle_config' | 'symbol' | 'chain_config';
