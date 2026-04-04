export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface RealtimeMessage {
  id: string;
  channel: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

export interface RealtimeState {
  connectionStatus: ConnectionStatus;
  subscriptions: Set<string>;
  lastMessage: RealtimeMessage | null;
  reconnectAttempts: number;
  lastConnectedAt: number | null;
}

export interface RealtimeActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  addSubscription: (channel: string) => void;
  removeSubscription: (channel: string) => void;
  setLastMessage: (message: RealtimeMessage | null) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setLastConnectedAt: (timestamp: number | null) => void;
  reset: () => void;
}

export type RealtimeStore = RealtimeState & RealtimeActions;
