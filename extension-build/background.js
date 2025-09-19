// public/background.js
// Service Worker para extensão Chrome

// Configurações
const FINESSE_URLS = [
  'https://sncfinesse1.totvs.com.br',
  'https://sncfinesse2.totvs.com.br'
];

// Listeners principais
chrome.runtime.onInstalled.addListener(() => {
  console.log('Finesse Notifier instalado');
  setupInitialConfiguration();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Finesse Notifier iniciado');
});

// Configuração inicial
async function setupInitialConfiguration() {
  try {
    // Verificar se já existe configuração
    const existingConfig = await chrome.storage.local.get(['timerSettings']);
    
    if (!existingConfig.timerSettings) {
      // Configurações padrão
      const defaultConfig = {
        timerSettings: {
          standardTimer: 5,
          pauseTimer: 30
        },
        notificationConfig: {
          windowsNotification: true,
          googleChatNotification: false
        }
      };
      
      await chrome.storage.local.set(defaultConfig);
      console.log('Configuração inicial aplicada');
    }
  } catch (error) {
    console.error('Erro na configuração inicial:', error);
  }
}

// Gerenciamento de notificações
chrome.notifications.onClicked.addListener(async (notificationId) => {
  try {
    // Focar na aba do Finesse quando notificação for clicada
    const tabs = await chrome.tabs.query({ 
      url: FINESSE_URLS.map(url => `${url}/*`) 
    });
    
    if (tabs.length > 0) {
      // Ativar primeira aba encontrada
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Abrir nova aba do Finesse
      await chrome.tabs.create({ 
        url: FINESSE_URLS[0] 
      });
    }
    
    // Limpar notificação
    chrome.notifications.clear(notificationId);
  } catch (error) {
    console.error('Erro ao processar clique na notificação:', error);
  }
});

// Monitor de abas do Finesse
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  checkFinesseStatus();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    checkFinesseStatus();
  }
});

// Verificar status do Finesse
async function checkFinesseStatus() {
  try {
    const finessePattern = FINESSE_URLS.map(url => `${url}/*`);
    const tabs = await chrome.tabs.query({ url: finessePattern });
    
    const isFinesseOpen = tabs.length > 0;
    
    // Notificar popup sobre mudança de status
    try {
      await chrome.runtime.sendMessage({
        type: 'FINESSE_STATUS_CHANGED',
        isFinesseOpen
      });
    } catch (error) {
      // Popup pode não estar aberto - isso é normal
    }
    
    // Salvar status
    await chrome.storage.local.set({ isFinesseOpen });
    
  } catch (error) {
    console.error('Erro ao verificar status do Finesse:', error);
  }
}

// Gerenciamento de alarmes para monitoramento
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'statusCheck') {
    try {
      // Verificar se deve monitorar
      const data = await chrome.storage.local.get([
        'secureCredentials',
        'scheduleSettings',
        'isFinesseOpen'
      ]);
      
      if (!data.secureCredentials || !data.isFinesseOpen) {
        return; // Não monitorar se não há credenciais ou Finesse fechado
      }
      
      // Notificar popup para verificar status
      try {
        await chrome.runtime.sendMessage({
          type: 'CHECK_AGENT_STATUS'
        });
      } catch (error) {
        // Popup pode não estar aberto
      }
      
    } catch (error) {
      console.error('Erro no alarme de verificação:', error);
    }
  }
});

// Configurar alarme quando necessário
async function setupStatusAlarm(intervalMinutes) {
  try {
    // Limpar alarme existente
    await chrome.alarms.clear('statusCheck');
    
    // Criar novo alarme
    await chrome.alarms.create('statusCheck', {
      periodInMinutes: intervalMinutes
    });
    
    console.log(`Alarme configurado para ${intervalMinutes} minutos`);
  } catch (error) {
    console.error('Erro ao configurar alarme:', error);
  }
}

// Listener para mensagens do popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'SETUP_ALARM':
      setupStatusAlarm(request.intervalMinutes)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Manter canal aberto para resposta assíncrona
      
    case 'CLEAR_ALARM':
      chrome.alarms.clear('statusCheck')
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'GET_FINESSE_STATUS':
      checkFinesseStatus()
        .then(() => chrome.storage.local.get(['isFinesseOpen']))
        .then(data => sendResponse({ isFinesseOpen: data.isFinesseOpen || false }))
        .catch(error => sendResponse({ isFinesseOpen: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ error: 'Tipo de mensagem desconhecido' });
  }
});

// Verificação inicial do status do Finesse
checkFinesseStatus();

// Configurações de segurança
chrome.webRequest?.onBeforeRequest.addListener(
  (details) => {
    // Log de requisições para monitoramento
    if (details.url.includes('finesse')) {
      console.log('Requisição Finesse:', details.url);
    }
  },
  { urls: FINESSE_URLS.map(url => `${url}/*`) },
  ['requestBody']
);

console.log('Background script carregado');