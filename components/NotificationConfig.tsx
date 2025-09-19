// components/NotificationConfig.tsx
import React, { useState, useEffect } from 'react';
import { NotificationConfig } from '@/types/finesse';

interface NotificationConfigProps {
  config: NotificationConfig;
  onUpdate: (config: NotificationConfig) => Promise<boolean>;
  onTest: () => Promise<void>;
}

export const NotificationConfigComponent: React.FC<NotificationConfigProps> = ({
  config,
  onUpdate,
  onTest
}) => {
  const [localConfig, setLocalConfig] = useState<NotificationConfig>(config);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [webhookError, setWebhookError] = useState<string>('');

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleToggle = async (field: 'windowsNotification' | 'googleChatNotification') => {
    const newConfig = { ...localConfig, [field]: !localConfig[field] };
    setLocalConfig(newConfig);

    setIsUpdating(true);
    await onUpdate(newConfig);
    setIsUpdating(false);
  };

  const handleWebhookChange = async (webhook: string) => {
    setWebhookError('');
    
    // Validação básica da URL do webhook
    if (webhook && !isValidWebhookUrl(webhook)) {
      setWebhookError('URL do webhook inválida. Deve começar com https://chat.googleapis.com');
      return;
    }

    const newConfig = { ...localConfig, googleChatWebhook: webhook };
    setLocalConfig(newConfig);

    setIsUpdating(true);
    await onUpdate(newConfig);
    setIsUpdating(false);
  };

  const isValidWebhookUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === 'chat.googleapis.com' && parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      await onTest();
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Notificação</h3>
      
      <div className="space-y-6">
        {/* Notificações do Windows */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-md font-medium text-gray-900">Notificações do Windows</h4>
            <p className="text-sm text-gray-600">Exibir notificações na área de trabalho</p>
          </div>
          <button
            onClick={() => handleToggle('windowsNotification')}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              localConfig.windowsNotification ? 'bg-blue-600' : 'bg-gray-200'
            } ${isUpdating ? 'opacity-50' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                localConfig.windowsNotification ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Google Chat */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-md font-medium text-gray-900">Google Chat</h4>
              <p className="text-sm text-gray-600">Enviar notificações para o Google Chat</p>
            </div>
            <button
              onClick={() => handleToggle('googleChatNotification')}
              disabled={isUpdating}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                localConfig.googleChatNotification ? 'bg-blue-600' : 'bg-gray-200'
              } ${isUpdating ? 'opacity-50' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  localConfig.googleChatNotification ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {localConfig.googleChatNotification && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                URL do Webhook do Google Chat:
              </label>
              <input
                type="url"
                placeholder="https://chat.googleapis.com/v1/spaces/..."
                value={localConfig.googleChatWebhook || ''}
                onChange={(e) => handleWebhookChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {webhookError && (
                <p className="text-sm text-red-600">{webhookError}</p>
              )}
              <p className="text-xs text-gray-500">
                Para obter o webhook, vá em Configurações do espaço → Aplicativos e integrações → Webhooks
              </p>
            </div>
          )}
        </div>

        {/* Botão de teste */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleTestNotification}
            disabled={isTesting}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
          >
            {isTesting ? 'Testando...' : 'Testar Notificação'}
          </button>
        </div>

        {/* Informações sobre permissões */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h5 className="text-sm font-medium text-blue-900 mb-2">Informações importantes:</h5>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• As notificações do Windows requerem permissão do navegador</li>
            <li>• O Google Chat requer configuração de webhook no espaço desejado</li>
            <li>• Se as notificações do Windows estiverem desabilitadas, o Google Chat será usado como alternativa</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

