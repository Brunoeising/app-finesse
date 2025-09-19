// components/ScheduleConfig.tsx
import React, { useState, useEffect } from 'react';
import { ScheduleSettings, WorkSchedule, scheduleService } from '@/lib/services/scheduleService';

interface ScheduleConfigProps {
  settings: ScheduleSettings;
  onUpdate: (settings: ScheduleSettings) => Promise<boolean>;
}

export const ScheduleConfig: React.FC<ScheduleConfigProps> = ({
  settings,
  onUpdate
}) => {
  const [localSettings, setLocalSettings] = useState<ScheduleSettings>(settings);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggleDay = async (dayIndex: number) => {
    const updatedSchedules = localSettings.workSchedules.map((schedule, index) => {
      if (index === dayIndex) {
        return { ...schedule, enabled: !schedule.enabled };
      }
      return schedule;
    });

    const newSettings = { ...localSettings, workSchedules: updatedSchedules };
    setLocalSettings(newSettings);

    setIsUpdating(true);
    await onUpdate(newSettings);
    setIsUpdating(false);
  };

  const handleTimeChange = async (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    const updatedSchedules = localSettings.workSchedules.map((schedule, index) => {
      if (index === dayIndex) {
        const updatedSchedule = { ...schedule, [field]: value };
        const validation = scheduleService.validateSchedule(updatedSchedule);
        if (!validation.valid) {
          return schedule; // Manter valor anterior se inválido
        }
        return updatedSchedule;
      }
      return schedule;
    });

    const newSettings = { ...localSettings, workSchedules: updatedSchedules };
    setLocalSettings(newSettings);

    setIsUpdating(true);
    await onUpdate(newSettings);
    setIsUpdating(false);
  };

  const handleNotifyOutsideHours = async (enabled: boolean) => {
    const newSettings = { ...localSettings, notifyOutsideHours: enabled };
    setLocalSettings(newSettings);

    setIsUpdating(true);
    await onUpdate(newSettings);
    setIsUpdating(false);
  };

  const getCurrentStatus = () => {
    const isWithinHours = scheduleService.isWithinWorkingHours(localSettings);
    const now = new Date();
    const currentTime = now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const currentDay = scheduleService.getDayName(now.getDay());

    if (localSettings.notifyOutsideHours) {
      return `Monitoramento ativo 24/7 (${currentDay}, ${currentTime})`;
    }

    if (isWithinHours) {
      return `Monitoramento ativo (${currentDay}, ${currentTime})`;
    } else {
      return `Fora do horário de trabalho (${currentDay}, ${currentTime})`;
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuração de Horários</h3>
      
      {/* Status atual */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${
            scheduleService.isWithinWorkingHours(localSettings) || localSettings.notifyOutsideHours 
              ? 'bg-green-500' 
              : 'bg-yellow-500'
          }`} />
          <span className="text-sm font-medium text-blue-900">
            {getCurrentStatus()}
          </span>
        </div>
      </div>

      {/* Opção de monitoramento 24/7 */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="text-md font-medium text-gray-900">Monitoramento 24/7</h4>
          <p className="text-sm text-gray-600">Receber notificações fora do horário de trabalho</p>
        </div>
        <button
          onClick={() => handleNotifyOutsideHours(!localSettings.notifyOutsideHours)}
          disabled={isUpdating}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            localSettings.notifyOutsideHours ? 'bg-blue-600' : 'bg-gray-200'
          } ${isUpdating ? 'opacity-50' : ''}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              localSettings.notifyOutsideHours ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Configuração por dia da semana */}
      {!localSettings.notifyOutsideHours && (
        <div className="space-y-2">
          <h4 className="text-md font-medium text-gray-900 mb-3">Horários de Trabalho</h4>
          
          {localSettings.workSchedules.map((schedule, index) => {
            const dayName = scheduleService.getDayName(schedule.dayOfWeek);
            const isExpanded = expandedDay === index;

            return (
              <div key={schedule.id} className="border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleToggleDay(index)}
                      disabled={isUpdating}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        schedule.enabled ? 'bg-green-600' : 'bg-gray-200'
                      } ${isUpdating ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          schedule.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    
                    <div>
                      <span className="font-medium text-gray-900">{dayName}</span>
                      {schedule.enabled && (
                        <span className="ml-2 text-sm text-gray-600">
                          {schedule.startTime} às {schedule.endTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {schedule.enabled && (
                    <button
                      onClick={() => setExpandedDay(isExpanded ? null : index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {isExpanded ? 'Fechar' : 'Editar'}
                    </button>
                  )}
                </div>

                {isExpanded && schedule.enabled && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Início
                        </label>
                        <input
                          type="time"
                          value={schedule.startTime}
                          onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fim
                        </label>
                        <input
                          type="time"
                          value={schedule.endTime}
                          onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Informações importantes */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h5 className="text-sm font-medium text-yellow-900 mb-2">Informações sobre horários:</h5>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• As notificações só serão enviadas durante os horários configurados</li>
          <li>• Se o Finesse estiver fechado, as notificações serão suspensas</li>
          <li>• O monitoramento 24/7 ignora os horários de trabalho</li>
          <li>• Os horários são baseados no fuso horário local do sistema</li>
        </ul>
      </div>
    </div>
  );
};