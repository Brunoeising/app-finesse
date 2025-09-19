
// components/AgentStatus.tsx
import React from 'react';
import { FinesseApiResponse } from '@/types/finesse';

interface AgentStatusProps {
  status: FinesseApiResponse | null;
  isConnected: boolean;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const AgentStatus: React.FC<AgentStatusProps> = ({ 
  status, 
  isConnected, 
  onRefresh, 
  isLoading = false 
}) => {
  const getStatusColor = (state?: string) => {
    switch (state) {
      case 'READY':
        return 'bg-green-500';
      case 'NOT_READY':
        return 'bg-red-500';
      case 'WORK_READY':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (!isConnected) return 'Desconectado';
    if (!status) return 'Carregando...';
    if (status.state?.text === 'READY') return 'Pronto';
    if (status.reasonCodeId?.text === '-1') return 'Não Está Pronto';
    if (status.label?.text) return status.label.text;
    return status.state?.text || 'Desconhecido';
  };

  const getAgentName = () => {
    if (!status || !status.firstName || !status.lastName) return 'Desconectado';
    return `${status.firstName.text} ${status.lastName.text}`;
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div 
            className={`w-4 h-4 rounded-full mr-3 ${getStatusColor(status?.state?.text)}`}
          />
          <h3 className="text-lg font-semibold text-gray-900">Status do Agente</h3>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
        >
          {isLoading ? '...' : 'Atualizar'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Agente conectado:</p>
          <p className="font-bold text-gray-900">{getAgentName()}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Status atual:</p>
          <p className="font-bold text-gray-900">{getStatusText()}</p>
        </div>
      </div>

      {!isConnected && (
        <div className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Verifique a conexão VPN, Cisco Jabber e Finesse
        </div>
      )}
    </div>
  );
};
