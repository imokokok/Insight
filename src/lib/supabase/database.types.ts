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
    };
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Views: {};
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
