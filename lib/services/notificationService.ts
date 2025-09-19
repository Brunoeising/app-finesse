// lib/services/notificationService.ts
import { NotificationPayload, NotificationType, GoogleChatMessage } from '@/types/notifications';

class NotificationService {
  private notificationMessages = {
    [NotificationType.NOT_READY]: "Telefone Desconectado - Status Não Pronto",
    [NotificationType.DEVICE_ERROR]: "Telefone Desconectado - Verifique a VPN / Cisco Jabber / Finesse",
    [NotificationType.TIME_EXCEEDED]: (time: number) => 
      `Você está há mais de ${time} minutos com o telefone em pausa`
  };

  async sendWindowsNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      // Verificar se as notificações são suportadas
      if (!("Notification" in window)) {
        console.warn("Este navegador não suporta notificações desktop");
        return false;
      }

      // Verificar permissão
      if (Notification.permission === "granted") {
        this.createNotification(payload);
        return true;
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          this.createNotification(payload);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Erro ao enviar notificação Windows:", error);
      return false;
    }
  }

  private createNotification(payload: NotificationPayload): void {
    const notification = new Notification("Notificação Finesse", {
      body: payload.message,
      // icon: "/icons/icon48.png",
      // badge: "/icons/icon16.png",
      tag: "finesse-notification",
      requireInteraction: true,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    notification.onclick = () => {
      window.focus();
      this.focusFinesseTab();
      notification.close();
    };
  }

  private focusFinesseTab(): void {
    const finesseUrls = [
      "https://sncfinesse1.totvs.com.br:8445/",
      "https://sncfinesse2.totvs.com.br:8445/"
    ];

    // Buscar tab do Finesse e focar
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ url: finesseUrls }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id!, { active: true });
        }
      });
    }
  }

  async sendGoogleChatNotification(
    webhookUrl: string,
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      const message: GoogleChatMessage = {
        text: this.formatGoogleChatMessage(payload),
        cards: [
          {
            header: {
              title: "🔔 Finesse Notifier",
              subtitle: `Agente: ${payload.agentId || 'N/A'}`,
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: `<b>Mensagem:</b> ${payload.message}`
                    }
                  },
                  {
                    textParagraph: {
                      text: `<b>Horário:</b> ${payload.timestamp.toLocaleString('pt-BR')}`
                    }
                  },
                  {
                    buttons: [
                      {
                        textButton: {
                          text: "Acessar Finesse",
                          onClick: {
                            openLink: {
                              url: "https://sncfinesse1.totvs.com.br:8445/"
                            }
                          }
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      return response.ok;
    } catch (error) {
      console.error("Erro ao enviar notificação Google Chat:", error);
      return false;
    }
  }

  private formatGoogleChatMessage(payload: NotificationPayload): string {
    const icon = this.getNotificationIcon(payload.type);
    return `${icon} *Finesse Alert* - ${payload.message}`;
  }

  private getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.NOT_READY:
        return "⚠️";
      case NotificationType.DEVICE_ERROR:
        return "🔌";
      case NotificationType.TIME_EXCEEDED:
        return "⏰";
      default:
        return "🔔";
    }
  }

  async checkNotificationPermissions(): Promise<{
    windows: boolean;
    googleChat: boolean;
    webhookConfigured: boolean;
  }> {
    const windowsPermission = "Notification" in window && Notification.permission === "granted";
    
    // Verificar se há webhook configurado no storage
    const storage = await this.getStorageData(['googleChatWebhook']);
    const webhookConfigured = !!storage.googleChatWebhook;

    return {
      windows: windowsPermission,
      googleChat: true, // Google Chat sempre disponível se webhook configurado
      webhookConfigured,
    };
  }

  private async getStorageData(keys: string[]): Promise<Record<string, any>> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(keys, resolve);
      } else {
        // Fallback para localStorage em ambiente web
        const result: Record<string, any> = {};
        keys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              result[key] = JSON.parse(value);
            } catch {
              result[key] = value;
            }
          }
        });
        resolve(result);
      }
    });
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission === "denied") {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  getMessage(type: NotificationType, additionalParam?: number): string {
    const message = this.notificationMessages[type];
    if (typeof message === 'function') {
      return message(additionalParam || 0);
    }
    return message;
  }
}

export const notificationService = new NotificationService();