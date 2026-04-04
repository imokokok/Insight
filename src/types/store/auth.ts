import type { User, AuthSession } from '@/types/auth';

export interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  avatar?: string;
  preferences?: {
    defaultOracle?: string;
    defaultSymbol?: string;
    theme?: 'light' | 'dark' | 'system';
    chartSettings?: Record<string, unknown>;
  };
  notificationSettings?: {
    emailAlerts?: boolean;
    pushNotifications?: boolean;
  };
  createdAt?: number;
  updatedAt?: number;
}

export interface StoreAuthState {
  user: User | null;
  session: AuthSession | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
}

export interface StoreAuthActions {
  setUser: (user: User | null) => void;
  setSession: (session: AuthSession | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export type StoreAuthStore = StoreAuthState & StoreAuthActions;
