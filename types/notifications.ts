// types/notifications.ts
export enum NotificationType {
  NOT_READY = 'playAudioNotReady',
  DEVICE_ERROR = 'playAudioDeviceError',
  TIME_EXCEEDED = 'playAudioIntervalTimeExceed'
}

export interface NotificationPayload {
  type: NotificationType;
  message: string;
  timestamp: Date;
  agentId?: string;
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