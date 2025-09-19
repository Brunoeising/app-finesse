// lib/services/scheduleService.ts
import { format, isWithinInterval, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface WorkSchedule {
  id: string;
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, etc.
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  enabled: boolean;
}

export interface ScheduleSettings {
  workSchedules: WorkSchedule[];
  timezone: string;
  notifyOutsideHours: boolean;
}

class ScheduleService {
  private readonly defaultSchedule: WorkSchedule[] = [
    { id: '1', dayOfWeek: 1, startTime: '08:00', endTime: '18:00', enabled: true }, // Segunda
    { id: '2', dayOfWeek: 2, startTime: '08:00', endTime: '18:00', enabled: true }, // Terça
    { id: '3', dayOfWeek: 3, startTime: '08:00', endTime: '18:00', enabled: true }, // Quarta
    { id: '4', dayOfWeek: 4, startTime: '08:00', endTime: '18:00', enabled: true }, // Quinta
    { id: '5', dayOfWeek: 5, startTime: '08:00', endTime: '18:00', enabled: true }, // Sexta
    { id: '6', dayOfWeek: 6, startTime: '08:00', endTime: '12:00', enabled: false }, // Sábado
    { id: '7', dayOfWeek: 0, startTime: '08:00', endTime: '12:00', enabled: false }, // Domingo
  ];

  /**
   * Verifica se o horário atual está dentro do expediente
   */
  isWithinWorkingHours(scheduleSettings?: ScheduleSettings): boolean {
    if (!scheduleSettings || scheduleSettings.notifyOutsideHours) {
      return true; // Se não há configuração ou deve notificar fora do horário
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = format(now, 'HH:mm');

    const todaySchedule = scheduleSettings.workSchedules.find(
      schedule => schedule.dayOfWeek === currentDay && schedule.enabled
    );

    if (!todaySchedule) {
      return false; // Não há expediente configurado para hoje
    }

    const startTime = parse(todaySchedule.startTime, 'HH:mm', new Date());
    const endTime = parse(todaySchedule.endTime, 'HH:mm', new Date());
    const currentDateTime = parse(currentTime, 'HH:mm', new Date());

    if (!isValid(startTime) || !isValid(endTime) || !isValid(currentDateTime)) {
      console.error('Horários inválidos na configuração');
      return true; // Em caso de erro, permite notificação
    }

    return isWithinInterval(currentDateTime, { start: startTime, end: endTime });
  }

  /**
   * Obter configuração padrão de horários
   */
  getDefaultScheduleSettings(): ScheduleSettings {
    return {
      workSchedules: this.defaultSchedule,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notifyOutsideHours: false,
    };
  }

  /**
   * Validar configuração de horário
   */
  validateSchedule(schedule: WorkSchedule): { valid: boolean; error?: string } {
    if (schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
      return { valid: false, error: 'Dia da semana inválido' };
    }

    if (!this.isValidTime(schedule.startTime) || !this.isValidTime(schedule.endTime)) {
      return { valid: false, error: 'Formato de horário inválido (use HH:mm)' };
    }

    const start = parse(schedule.startTime, 'HH:mm', new Date());
    const end = parse(schedule.endTime, 'HH:mm', new Date());

    if (start >= end) {
      return { valid: false, error: 'Horário de início deve ser menor que o horário de fim' };
    }

    return { valid: true };
  }

  /**
   * Validar formato de horário
   */
  private isValidTime(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Obter nome do dia da semana
   */
  getDayName(dayOfWeek: number): string {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[dayOfWeek] || 'Desconhecido';
  }

  /**
   * Verificar se deve monitorar com base no status do Finesse
   */
  shouldMonitor(isFinesseOpen: boolean, scheduleSettings?: ScheduleSettings): boolean {
    // Se o Finesse está fechado, não deve monitorar
    if (!isFinesseOpen) {
      return false;
    }

    // Verificar se está dentro do horário de trabalho
    return this.isWithinWorkingHours(scheduleSettings);
  }

  /**
   * Calcular próximo horário de trabalho
   */
  getNextWorkingTime(scheduleSettings: ScheduleSettings): Date | null {
    const now = new Date();
    const currentDay = now.getDay();
    
    // Procurar pelo próximo dia útil
    for (let i = 0; i < 7; i++) {
      const checkDay = (currentDay + i) % 7;
      const daySchedule = scheduleSettings.workSchedules.find(
        s => s.dayOfWeek === checkDay && s.enabled
      );

      if (daySchedule) {
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + i);
        
        const startTime = parse(daySchedule.startTime, 'HH:mm', nextDate);
        
        // Se é hoje, verificar se ainda não passou do horário
        if (i === 0 && startTime <= now) {
          continue;
        }

        return startTime;
      }
    }

    return null; // Nenhum horário de trabalho encontrado
  }
}

export const scheduleService = new ScheduleService();