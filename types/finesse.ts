// types/finesse.ts
export interface FinesseUser {
  firstName: { text: string };
  lastName: { text: string };
  state: { text: 'READY' | 'NOT_READY' | 'WORK_READY' | 'LOGOUT' };
  reasonCodeId?: { text: string };
  label?: { text: string };
}

export interface FinesseApiResponse {
  ApiErrors?: any;
  firstName?: { text: string };
  lastName?: { text: string };
  state?: { text: string };
  reasonCodeId?: { text: string };
  label?: { text: string };
}

export interface UserCredentials {
  username: string;
  password: string;
  agentId: string;
}

export interface TimerSettings {
  standardTimer: number;
  pauseTimer: number;
}

export interface NotificationConfig {
  windowsNotification: boolean;
  googleChatNotification: boolean;
  googleChatWebhook?: string;
}

export interface AgentStatus {
  name: string;
  status: string;
  reasonCode?: string;
  timestamp: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GoogleChatMessage {
  text: string;
  cards?: any[];
  thread?: {
    name: string;
  };
}

