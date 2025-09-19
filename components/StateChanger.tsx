// components/StateChanger.tsx
import React, { useState, useEffect } from 'react';

interface ReasonCode {
  id: { text: string };
  label: { text: string };
  category: string;
}

interface StateChangerProps {
  currentState?: string;
  onStateChange: (state: 'READY' | 'NOT_READY', reasonCodeId?: string) => Promise<boolean>;
  getReasonCodes: () => Promise<ReasonCode[]>;
}

export const StateChanger: React.FC<StateChangerProps> = ({ 
  currentState, 
  onStateChange,
  getReasonCodes
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [reasonCodes, setReasonCodes] = useState<ReasonCode[]>([]);
  const [selectedReasonCode, setSelectedReasonCode] = useState<string>('');
  const [loadingCodes, setLoadingCodes] = useState(false);

  useEffect(() => {
    loadReasonCodes();
  }, []);

  const loadReasonCodes = async () => {
    setLoadingCodes(true);
    try {
      const codes = await getReasonCodes();
      setReasonCodes(codes);
    } catch (error) {
      console.error('Erro ao carregar códigos de motivo:', error);
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleStateChange = async (newState: 'READY' | 'NOT_READY') => {
    setIsLoading(true);
    try {
      const success = await onStateChange(
        newState, 
        newState === 'NOT_READY' ? selectedReasonCode : undefined
      );
      
      if (success) {
        setSelectedReasonCode('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStateDisplayText = (state?: string) => {
    switch (state) {
      case 'READY':
        return 'Pronto';
      case 'NOT_READY':
        return 'Não Pronto';
      case 'WORK_READY':
        return 'Trabalhando';
      default:
        return 'Desconhecido';
    }
  };

  const getStateColor = (state?: string) => {
    switch (state) {
      case 'READY':
        return 'text-green-600 bg-green-100';
      case 'NOT_READY':
        return 'text-red-600 bg-red-100';
      case 'WORK_READY':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Alterar Status do Agente</h3>
      
      {/* Status atual */}
      <div className="mb-6 p-4 rounded-lg border-2 border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Status atual:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStateColor(currentState)}`}>
            {getStateDisplayText(currentState)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Botão Pronto */}
        <div>
          <button
            onClick={() => handleStateChange('READY')}
            disabled={isLoading || currentState === 'READY'}
            className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Alterando...' : 'Definir como Pronto'}
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Define o status como disponível para receber chamadas
          </p>
        </div>

        {/* Seção Não Pronto */}
        <div className="border-t pt-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Pausas e Motivos</h4>
          
          {loadingCodes ? (
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded mb-2"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Dropdown de códigos de motivo */}
              <div>
                <label htmlFor="reasonCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Selecione o motivo da pausa:
                </label>
                <select
                  id="reasonCode"
                  value={selectedReasonCode}
                  onChange={(e) => setSelectedReasonCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Selecione um motivo --</option>
                  {reasonCodes.map((code, index) => (
                    <option key={`${code.id?.text || index}`} value={code.id?.text || ''}>
                      {code.label?.text || `Código ${code.id?.text}`}
                    </option>
                  ))}
                </select>
                
                {reasonCodes.length === 0 && !loadingCodes && (
                  <p className="text-sm text-gray-500 mt-1">
                    Nenhum código de motivo disponível
                  </p>
                )}
              </div>

              {/* Botão Não Pronto */}
              <button
                onClick={() => handleStateChange('NOT_READY')}
                disabled={isLoading || currentState === 'NOT_READY' || !selectedReasonCode}
                className="w-full bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Alterando...' : 'Definir como Não Pronto'}
              </button>
              
              {!selectedReasonCode && (
                <p className="text-xs text-gray-500">
                  Selecione um motivo para poder pausar o atendimento
                </p>
              )}
            </div>
          )}
        </div>

        {/* Códigos de motivo mais comuns */}
        {reasonCodes.length > 0 && (
          <div className="border-t pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Pausas rápidas:</h5>
            <div className="grid grid-cols-2 gap-2">
              {reasonCodes.slice(0, 4).map((code, index) => {
                const label = code.label?.text || `Código ${code.id?.text}`;
                const isAlmoco = label.toLowerCase().includes('almoço') || label.toLowerCase().includes('almoco');
                const isBanheiro = label.toLowerCase().includes('banheiro') || label.toLowerCase().includes('wc');
                const isPausa = label.toLowerCase().includes('pausa');
                
                if (isAlmoco || isBanheiro || isPausa) {
                  return (
                    <button
                      key={`quick-${code.id?.text || index}`}
                      onClick={() => {
                        setSelectedReasonCode(code.id?.text || '');
                        handleStateChange('NOT_READY');
                      }}
                      disabled={isLoading || currentState === 'NOT_READY'}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded disabled:opacity-50 transition-colors"
                    >
                      {label.length > 15 ? `${label.substring(0, 15)}...` : label}
                    </button>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Informações adicionais */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <h6 className="text-sm font-medium text-blue-900 mb-2">Informações importantes:</h6>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Status "Pronto": Disponível para receber chamadas</li>
          <li>• Status "Não Pronto": Em pausa, não receberá chamadas</li>
          <li>• Sempre selecione o motivo correto para suas pausas</li>
          <li>• O sistema monitora o tempo de pausa automaticamente</li>
        </ul>
      </div>
    </div>
  );
};