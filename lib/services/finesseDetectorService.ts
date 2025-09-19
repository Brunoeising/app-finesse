// lib/services/finesseDetectorService.ts

class FinesseDetectorService {
  private finesseUrls: string[];

  constructor() {
    const primaryUrl = process.env.NEXT_PUBLIC_FINESSE_URL_PRIMARY?.replace('/finesse/api', '') || '';
    const fallbackUrl = process.env.NEXT_PUBLIC_FINESSE_URL_FALLBACK?.replace('/finesse/api', '') || '';
    
    this.finesseUrls = [primaryUrl, fallbackUrl].filter(url => url);
  }

  /**
   * Verifica se o Finesse está aberto em alguma aba
   * Esta função funcionará apenas em extensão do Chrome
   */
  async isFinesseOpen(): Promise<boolean> {
    // Verificar se está rodando como extensão do Chrome
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      // Se não é extensão, assumir que está aberto (para desenvolvimento web)
      return true;
    }

    try {
      return new Promise((resolve) => {
        const urlPatterns = this.finesseUrls.map(url => `${url}/*`);
        
        chrome.tabs.query({ url: urlPatterns }, (tabs) => {
          if (chrome.runtime.lastError) {
            console.error('Erro ao verificar abas do Finesse:', chrome.runtime.lastError);
            resolve(false);
            return;
          }

          // Verificar se alguma aba do Finesse está ativa
          const activeFinesseTab = tabs.find(tab => tab.active || tab.audible);
          resolve(activeFinesseTab !== undefined && tabs.length > 0);
        });
      });
    } catch (error) {
      console.error('Erro na detecção do Finesse:', error);
      return false;
    }
  }

  /**
   * Foca na aba do Finesse se estiver aberta
   */
  async focusFinesseTab(): Promise<boolean> {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      // Se não é extensão, tentar abrir em nova aba
      const url = this.finesseUrls[0];
      if (url) {
        window.open(url, '_blank');
        return true;
      }
      return false;
    }

    try {
      return new Promise((resolve) => {
        const urlPatterns = this.finesseUrls.map(url => `${url}/*`);
        
        chrome.tabs.query({ url: urlPatterns }, (tabs) => {
          if (chrome.runtime.lastError || tabs.length === 0) {
            // Se não há aba aberta, abrir nova aba
            chrome.tabs.create({ url: this.finesseUrls[0] });
            resolve(true);
            return;
          }

          // Focar na primeira aba encontrada
          const tabToFocus = tabs[0];
          chrome.tabs.update(tabToFocus.id!, { active: true }, () => {
            if (chrome.runtime.lastError) {
              resolve(false);
              return;
            }
            
            // Focar na janela que contém a aba
            chrome.windows.update(tabToFocus.windowId, { focused: true });
            resolve(true);
          });
        });
      });
    } catch (error) {
      console.error('Erro ao focar aba do Finesse:', error);
      return false;
    }
  }

  /**
   * Monitora mudanças no status das abas do Finesse
   */
  startTabMonitoring(callback: (isOpen: boolean) => void): void {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      return;
    }

    // Listener para quando abas são fechadas
    chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
      const isOpen = await this.isFinesseOpen();
      callback(isOpen);
    });

    // Listener para quando abas são criadas
    chrome.tabs.onCreated.addListener(async (tab) => {
      if (tab.url && this.isFinesseUrl(tab.url)) {
        callback(true);
      }
    });

    // Listener para quando URLs das abas mudam
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.url && (this.isFinesseUrl(changeInfo.url) || this.wasFinesseUrl(changeInfo.url))) {
        const isOpen = await this.isFinesseOpen();
        callback(isOpen);
      }
    });
  }

  /**
   * Verifica se uma URL é do Finesse
   */
  private isFinesseUrl(url: string): boolean {
    return this.finesseUrls.some(finesseUrl => url.startsWith(finesseUrl));
  }

  /**
   * Verifica se uma URL era do Finesse (para detectar navegação para fora)
   */
  private wasFinesseUrl(url: string): boolean {
    // Esta função pode ser expandida para manter histórico se necessário
    return this.isFinesseUrl(url);
  }

  /**
   * Obter URLs do Finesse configuradas
   */
  getFinesseUrls(): string[] {
    return [...this.finesseUrls];
  }
}

export const finesseDetectorService = new FinesseDetectorService();