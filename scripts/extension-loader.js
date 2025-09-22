// extension-loader.js
// Script para garantir que a aplicação Next.js carregue corretamente na extensão

(function() {
  'use strict';

  // Aguardar o DOM carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    initializeExtension();
  }

  function initializeExtension() {
    console.log('Inicializando extensão...');
    
    // Verificar se estamos no contexto da extensão
    if (!chrome || !chrome.runtime || !chrome.runtime.id) {
      console.log('Não estamos no contexto de uma extensão Chrome');
      return;
    }

    // Verificar se o Next.js está presente
    checkNextJsApp();
  }

  function checkNextJsApp() {
    const nextRoot = document.getElementById('__next');
    
    if (!nextRoot) {
      console.error('Elemento #__next não encontrado!');
      createFallbackInterface();
      return;
    }

    // Aguardar o Next.js carregar
    let attempts = 0;
    const maxAttempts = 30; // 15 segundos no máximo
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      // Verificar se o conteúdo foi renderizado
      if (nextRoot.children.length > 0 && nextRoot.textContent.trim() !== '') {
        console.log('Next.js carregou com sucesso!');
        clearInterval(checkInterval);
        
        // Adicionar classes específicas para extensão se necessário
        document.body.classList.add('extension-mode');
        
        // Ajustar dimensões para popup
        if (window.location.pathname.includes('popup')) {
          document.body.style.width = '400px';
          document.body.style.minHeight = '500px';
        }
        
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.error('Timeout ao carregar Next.js');
        clearInterval(checkInterval);
        createFallbackInterface();
      }
    }, 500);
  }

  function createFallbackInterface() {
    console.log('Criando interface de fallback...');
    
    const app = document.getElementById('__next') || document.body;
    
    app.innerHTML = `
      <div style="
        min-height: 500px;
        width: 400px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="padding: 20px;">
          <h1 style="font-size: 24px; margin-bottom: 20px; text-align: center;">
            🎧 Finesse Notifier
          </h1>
          
          <div style="
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
          ">
            <h2 style="font-size: 18px; margin-bottom: 10px;">Status da Aplicação</h2>
            <p style="margin-bottom: 10px;">A interface principal não pôde ser carregada.</p>
            <p style="font-size: 14px; opacity: 0.9;">
              Isso pode acontecer devido a problemas de carregamento dos recursos.
            </p>
          </div>
          
          <div style="space-y: 10px;">
            <button onclick="openFullApp()" style="
              width: 100%;
              padding: 12px;
              background: rgba(255, 255, 255, 0.2);
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-radius: 8px;
              color: white;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              margin-bottom: 10px;
            ">
              Abrir Aplicação em Nova Aba
            </button>
            
            <button onclick="reloadExtension()" style="
              width: 100%;
              padding: 12px;
              background: rgba(255, 255, 255, 0.2);
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-radius: 8px;
              color: white;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
            ">
              Recarregar Extensão
            </button>
          </div>
          
          <div style="
            margin-top: 20px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            font-size: 14px;
          ">
            <h3 style="font-size: 16px; margin-bottom: 10px;">Solução de Problemas:</h3>
            <ol style="margin-left: 20px;">
              <li>Tente abrir em nova aba</li>
              <li>Recarregue a extensão</li>
              <li>Verifique se a VPN está conectada</li>
              <li>Reinicie o Chrome se necessário</li>
            </ol>
          </div>
        </div>
      </div>
    `;

    // Adicionar funções globais para os botões
    window.openFullApp = function() {
      chrome.tabs.create({
        url: chrome.runtime.getURL('index.html')
      });
    };

    window.reloadExtension = function() {
      chrome.runtime.reload();
    };
  }
})();