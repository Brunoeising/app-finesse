// lib/services/storageService.ts
import { UserCredentials, TimerSettings, NotificationConfig } from '@/types/finesse';
import { ScheduleSettings } from './scheduleService';
import { encryptionService } from './encryptionService';

interface SecureCredentials {
  encryptedData: string;
  hash: string;
  timestamp: number;
}

interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // em minutos
  sessionTimeout: number; // em minutos
}

class StorageService {
  private isExtension = typeof chrome !== 'undefined' && chrome.storage;
  private securityConfig: SecurityConfig;

  constructor() {
    this.securityConfig = {
      maxLoginAttempts: parseInt(process.env.NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS || '3'),
      lockoutDuration: parseInt(process.env.NEXT_PUBLIC_LOCKOUT_DURATION || '15'),
      sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '60'),
    };
  }

  // ===== CREDENCIAIS SEGURAS =====
  
  async saveCredentials(credentials: UserCredentials): Promise<boolean> {
    try {
      const encryptedData = encryptionService.encryptObject(credentials);
      const hash = encryptionService.generateHash(JSON.stringify(credentials));
      
      const secureData: SecureCredentials = {
        encryptedData,
        hash,
        timestamp: Date.now(),
      };

      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ secureCredentials: secureData }, () => {
            resolve(!chrome.runtime.lastError);
          });
        });
      } else {
        localStorage.setItem('secureCredentials', JSON.stringify(secureData));
        return true;
      }
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      return false;
    }
  }

  async getCredentials(): Promise<UserCredentials | null> {
    try {
      let secureData: SecureCredentials | null = null;

      if (this.isExtension) {
        secureData = await new Promise((resolve) => {
          chrome.storage.local.get(['secureCredentials'], (result) => {
            if (chrome.runtime.lastError || !result.secureCredentials) {
              resolve(null);
              return;
            }
            resolve(result.secureCredentials);
          });
        });
      } else {
        const storedData = localStorage.getItem('secureCredentials');
        if (storedData) {
          secureData = JSON.parse(storedData);
        }
      }

      if (!secureData) {
        return null;
      }

      // Verificar se a sessão não expirou
      const sessionAge = (Date.now() - secureData.timestamp) / (1000 * 60); // em minutos
      if (sessionAge > this.securityConfig.sessionTimeout) {
        await this.removeCredentials();
        return null;
      }

      // Descriptografar e validar
      const credentials = encryptionService.decryptObject<UserCredentials>(secureData.encryptedData);
      
      // Validar integridade dos dados
      if (!encryptionService.validateHash(JSON.stringify(credentials), secureData.hash)) {
        console.error('Dados corrompidos detectados');
        await this.removeCredentials();
        return null;
      }

      return credentials;
    } catch (error) {
      console.error('Erro ao recuperar credenciais:', error);
      await this.removeCredentials(); // Limpar dados corrompidos
      return null;
    }
  }

  async removeCredentials(): Promise<boolean> {
    try {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.remove(['secureCredentials'], () => {
            resolve(!chrome.runtime.lastError);
          });
        });
      } else {
        localStorage.removeItem('secureCredentials');
        return true;
      }
    } catch (error) {
      console.error('Erro ao remover credenciais:', error);
      return false;
    }
  }

  // ===== CONTROLE DE TENTATIVAS DE LOGIN =====
  
  async recordLoginAttempt(success: boolean, username: string): Promise<void> {
    const key = `loginAttempts_${username}`;
    let attempts = await this.getLoginAttempts(username);
    
    if (success) {
      // Limpar tentativas em caso de sucesso
      if (this.isExtension) {
        chrome.storage.local.remove([key]);
      } else {
        localStorage.removeItem(key);
      }
    } else {
      // Incrementar tentativas falhas
      attempts.count++;
      attempts.lastAttempt = Date.now();
      
      if (this.isExtension) {
        chrome.storage.local.set({ [key]: attempts });
      } else {
        localStorage.setItem(key, JSON.stringify(attempts));
      }
    }
  }

  async getLoginAttempts(username: string): Promise<{ count: number; lastAttempt: number }> {
    const key = `loginAttempts_${username}`;
    const defaultAttempts = { count: 0, lastAttempt: 0 };

    try {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            resolve(result[key] || defaultAttempts);
          });
        });
      } else {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultAttempts;
      }
    } catch {
      return defaultAttempts;
    }
  }

  async isAccountLocked(username: string): Promise<boolean> {
    const attempts = await this.getLoginAttempts(username);
    
    if (attempts.count < this.securityConfig.maxLoginAttempts) {
      return false;
    }

    const timeSinceLastAttempt = (Date.now() - attempts.lastAttempt) / (1000 * 60); // em minutos
    const isStillLocked = timeSinceLastAttempt < this.securityConfig.lockoutDuration;

    if (!isStillLocked) {
      // Lockout expirou, limpar tentativas
      await this.recordLoginAttempt(true, username);
    }

    return isStillLocked;
  }

  // ===== CONFIGURAÇÕES DE HORÁRIO =====
  
  async saveScheduleSettings(settings: ScheduleSettings): Promise<boolean> {
    try {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ scheduleSettings: settings }, () => {
            resolve(!chrome.runtime.lastError);
          });
        });
      } else {
        localStorage.setItem('scheduleSettings', JSON.stringify(settings));
        return true;
      }
    } catch (error) {
      console.error('Erro ao salvar configurações de horário:', error);
      return false;
    }
  }

  async getScheduleSettings(): Promise<ScheduleSettings | null> {
    try {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.get(['scheduleSettings'], (result) => {
            if (chrome.runtime.lastError || !result.scheduleSettings) {
              resolve(null);
              return;
            }
            resolve(result.scheduleSettings);
          });
        });
      } else {
        const stored = localStorage.getItem('scheduleSettings');
        return stored ? JSON.parse(stored) : null;
      }
    } catch (error) {
      console.error('Erro ao recuperar configurações de horário:', error);
      return null;
    }
  }

  // ===== CONFIGURAÇÕES DE TIMER =====
  
  async saveTimerSettings(settings: TimerSettings): Promise<boolean> {
    // Validar limites de segurança
    const minTimer = parseInt(process.env.NEXT_PUBLIC_MIN_TIMER_MINUTES || '1');
    const maxTimer = parseInt(process.env.NEXT_PUBLIC_MAX_TIMER_MINUTES || '120');
    
    if (settings.standardTimer < minTimer || settings.standardTimer > maxTimer) {
      return false;
    }
    
    if (settings.pauseTimer < minTimer || settings.pauseTimer > maxTimer) {
      return false;
    }
    
    if (settings.pauseTimer <= settings.standardTimer) {
      return false;
    }

    try {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ timerSettings: settings }, () => {
            resolve(!chrome.runtime.lastError);
          });
        });
      } else {
        localStorage.setItem('timerSettings', JSON.stringify(settings));
        return true;
      }
    } catch (error) {
      console.error('Erro ao salvar configurações de timer:', error);
      return false;
    }
  }

  async getTimerSettings(): Promise<TimerSettings> {
    const defaultSettings: TimerSettings = {
      standardTimer: parseInt(process.env.NEXT_PUBLIC_DEFAULT_STANDARD_TIMER || '5'),
      pauseTimer: parseInt(process.env.NEXT_PUBLIC_DEFAULT_PAUSE_TIMER || '30'),
    };

    try {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.get(['timerSettings'], (result) => {
            if (chrome.runtime.lastError || !result.timerSettings) {
              resolve(defaultSettings);
              return;
            }
            resolve(result.timerSettings);
          });
        });
      } else {
        const stored = localStorage.getItem('timerSettings');
        return stored ? JSON.parse(stored) : defaultSettings;
      }
    } catch (error) {
      console.error('Erro ao recuperar configurações de timer:', error);
      return defaultSettings;
    }
  }

  // ===== CONFIGURAÇÕES DE NOTIFICAÇÃO =====
  
  async saveNotificationConfig(config: NotificationConfig): Promise<boolean> {
    // Validar webhook se fornecido
    if (config.googleChatWebhook) {
      const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_WEBHOOK_DOMAIN || 'chat.googleapis.com';
      try {
        const url = new URL(config.googleChatWebhook);
        if (url.hostname !== allowedDomain) {
          return false;
        }
      } catch {
        return false;
      }
    }

    try {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ notificationConfig: config }, () => {
            resolve(!chrome.runtime.lastError);
          });
        });
      } else {
        localStorage.setItem('notificationConfig', JSON.stringify(config));
        return true;
      }
    } catch (error) {
      console.error('Erro ao salvar configurações de notificação:', error);
      return false;
    }
  }

  async getNotificationConfig(): Promise<NotificationConfig> {
    const defaultConfig: NotificationConfig = {
      windowsNotification: true,
      googleChatNotification: false,
    };

    try {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.get(['notificationConfig'], (result) => {
            if (chrome.runtime.lastError || !result.notificationConfig) {
              resolve(defaultConfig);
              return;
            }
            resolve(result.notificationConfig);
          });
        });
      } else {
        const stored = localStorage.getItem('notificationConfig');
        return stored ? JSON.parse(stored) : defaultConfig;
      }
    } catch (error) {
      console.error('Erro ao recuperar configurações de notificação:', error);
      return defaultConfig;
    }
  }

  // ===== STATUS DO AGENTE =====
  
  async saveAgentStatus(status: any): Promise<boolean> {
    try {
      const statusData = {
        status,
        timestamp: Date.now(),
      };

      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ agentStatus: statusData }, () => {
            resolve(!chrome.runtime.lastError);
          });
        });
      } else {
        localStorage.setItem('agentStatus', JSON.stringify(statusData));
        return true;
      }
    } catch (error) {
      console.error('Erro ao salvar status do agente:', error);
      return false;
    }
  }

  async getLastAgentStatus(): Promise<{ status: any; timestamp: Date } | null> {
    try {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.get(['agentStatus'], (result) => {
            if (chrome.runtime.lastError || !result.agentStatus) {
              resolve(null);
              return;
            }

            resolve({
              status: result.agentStatus.status,
              timestamp: new Date(result.agentStatus.timestamp),
            });
          });
        });
      } else {
        const stored = localStorage.getItem('agentStatus');
        if (!stored) return null;

        const data = JSON.parse(stored);
        return {
          status: data.status,
          timestamp: new Date(data.timestamp),
        };
      }
    } catch (error) {
      console.error('Erro ao recuperar último status do agente:', error);
      return null;
    }
  }

  // ===== UTILITÁRIOS =====
  
  async clearAllData(): Promise<boolean> {
    try {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.clear(() => {
            resolve(!chrome.runtime.lastError);
          });
        });
      } else {
        localStorage.clear();
        return true;
      }
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      return false;
    }
  }

  /**
   * Obter informações de segurança
   */
  getSecurityConfig(): SecurityConfig {
    return { ...this.securityConfig };
  }
}

export const storageService = new StorageService();