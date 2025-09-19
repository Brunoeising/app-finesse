// components/TimerSettings.tsx
import React, { useState, useEffect } from 'react';
import { TimerSettings } from '@/types/finesse';

interface TimerSettingsProps {
  settings: TimerSettings;
  onUpdate: (settings: TimerSettings) => Promise<boolean>;
}

export const TimerSettingsComponent: React.FC<TimerSettingsProps> = ({ 
  settings, 
  onUpdate 
}) => {
  const [localSettings, setLocalSettings] = useState<TimerSettings>(settings);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleUpdate = async (field: keyof TimerSettings, increment: number) => {
    const newValue = localSettings[field] + increment;
    
    if (newValue < 1 || newValue > 120) return;
    if (field === 'pauseTimer' && newValue <= localSettings.standardTimer) return;
    if (field === 'standardTimer' && newValue >= localSettings.pauseTimer) return;

    const newSettings = { ...localSettings, [field]: newValue };
    setLocalSettings(newSettings);

    setIsUpdating(true);
    await onUpdate(newSettings);
    setIsUpdating(false);
  };

  const handleInputChange = async (field: keyof TimerSettings, value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 1 || numValue > 120) return;

    const newSettings = { ...localSettings, [field]: numValue };
    
    // Validar regras de negócio
    if (field === 'pauseTimer' && numValue <= localSettings.standardTimer) return;
    if (field === 'standardTimer' && numValue >= localSettings.pauseTimer) return;

    setLocalSettings(newSettings);
    setIsUpdating(true);
    await onUpdate(newSettings);
    setIsUpdating(false);
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Timer</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timer Principal (minutos)
            <span className="text-xs text-gray-500 block">
              Tempo para verificação de falhas de conexão
            </span>
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleUpdate('standardTimer', -1)}
              disabled={isUpdating || localSettings.standardTimer <= 1}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-2 rounded disabled:opacity-50"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max="119"
              value={localSettings.standardTimer}
              onChange={(e) => handleInputChange('standardTimer', e.target.value)}
              className="w-20 px-3 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleUpdate('standardTimer', 1)}
              disabled={isUpdating || localSettings.standardTimer >= 119}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-2 rounded disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timer de Pausa (minutos)
            <span className="text-xs text-gray-500 block">
              Tempo para notificação de pausas prolongadas
            </span>
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleUpdate('pauseTimer', -1)}
              disabled={isUpdating || localSettings.pauseTimer <= localSettings.standardTimer + 1}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-2 rounded disabled:opacity-50"
            >
              -
            </button>
            <input
              type="number"
              min={localSettings.standardTimer + 1}
              max="120"
              value={localSettings.pauseTimer}
              onChange={(e) => handleInputChange('pauseTimer', e.target.value)}
              className="w-20 px-3 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleUpdate('pauseTimer', 1)}
              disabled={isUpdating || localSettings.pauseTimer >= 120}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-2 rounded disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>

        {localSettings.pauseTimer <= localSettings.standardTimer && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            O tempo de pausa deve ser maior que o timer principal
          </div>
        )}
      </div>
    </div>
  );
};