// hooks/useFinesse.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { finesseService } from '@/lib/services/finesseService';
import { storageService } from '@/lib/services/storageService';
import { notificationService } from '@/lib/services/notificationService';
import { scheduleService, ScheduleSettings } from '@/lib/services/scheduleService';
import { finesseDetectorService } from '@/lib/services/finesseDetectorService';
import { UserCredentials, FinesseApiResponse, TimerSettings, NotificationConfig } from '@/types/finesse';
import { NotificationType } from '@/types/notifications';

interface UseFinesseReturn {
  agentStatus: FinesseApiResponse | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  credentials: UserCredentials | null;
  timerSettings: TimerSettings;
  notificationConfig: NotificationConfig;
  scheduleSettings: ScheduleSettings;
  isFinesseOpen: boolean;
  isAccountLocked: boolean;
  remainingAttempts: number;
  login: (credentials: UserCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  changeAgentState: (state: 'READY' | 'NOT_READY', reasonCodeId?: string) => Promise<boolean>;
  updateTimerSettings: (settings: TimerSettings) => Promise<boolean>;
  updateNotificationConfig: (config: NotificationConfig) => Promise<boolean>;
  updateScheduleSettings: (settings: ScheduleSettings) => Promise<boolean>;
  testNotification: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  getReasonCodes: () => Promise<any[]>;
}

export const useFinesse = (): UseFinesseReturn => {
  const [agentStatus, setAgentStatus] = useState<FinesseApiResponse | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<UserCredentials | null>(null);
  const [isFinesseOpen, setIsFinesseOpen] = useState<boolean>(true);
  const [isAccountLocked, setIsAccountLocked] = useState<boolean>(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3);

  // Configurações
  const [timerSettings, setTimerSettings] = useState<TimerSettings>({
    standardTimer: parseInt(process.env.NEXT_PUBLIC_DEFAULT_STANDARD_TIMER || '5'),
    pauseTimer: parseInt(process.env.NEXT_PUBLIC_DEFAULT_PAUSE_TIMER || '30'),
  });

  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    windowsNotification: true,
    googleChatNotification: false,
  });

  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(
    scheduleService.getDefaultScheduleSettings()
  );

  // Refs para controle de timers
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Verificação de status em tempo real
  const checkAgentStatus = useCallback(async (creds?: UserCredentials, showLoading = false) => {
    const currentCredentials = creds || credentials;
    if (!currentCredentials) return;

    if (showLoading) setIsLoading(true);

    try {
      // Verificar se deve monitorar baseado no Finesse e horários
      const shouldMonitor = scheduleService.shouldMonitor(isFinesseOpen, scheduleSettings);
      
      if (!shouldMonitor) {
        setIsConnected(false);
        setError('Monitoramento pausado (fora do horário ou Finesse fechado)');
        if (showLoading) setIsLoading(false);
        return;
      }

      const response = await finesseService.connectApi(currentCredentials);
      
      if (response.success && response.data) {
        setAgentStatus(response.data);
        setIsConnected(true);
        setError(null);
        await storageService.saveAgentStatus(response.data);
        
        // Verificar condições para notificações
        await handleStatusNotifications(response.data);
      } else {
        setIsConnected(false);
        setError(response.error || 'Erro na conexão com Finesse');
        
        // Notificar sobre erro de conexão apenas se estiver monitorando
        if (shouldMonitor) {
          await sendNotification(NotificationType.DEVICE_ERROR);
        }
      }
    } catch (err) {
      setIsConnected(false);
      setError('Erro na verificação do status');
      console.error('Erro no checkAgentStatus:', err);
    }

    if (showLoading) setIsLoading(false);
  }, [credentials, isFinesseOpen, scheduleSettings]);

  // Gerenciamento de notificações baseado no status
  const handleStatusNotifications = async (status: FinesseApiResponse) => {
    const reasonCodeId = status.reasonCodeId ? parseInt(status.reasonCodeId.text) : null;
    const finesseState = status.state ? status.state.text : null;

    // Verificar se deve notificar baseado no horário
    if (!scheduleService.shouldMonitor(isFinesseOpen, scheduleSettings)) {
      return;
    }

    if (reasonCodeId === -1) {
      await sendNotification(NotificationType.NOT_READY);
      await focusFinesseTab();
    } else if (reasonCodeId && reasonCodeId > 0 && reasonCodeId < 50) {
      // Parar verificações e iniciar contador de pausa
      stopStatusCheck();
      const countTimer = (timerSettings.pauseTimer - timerSettings.standardTimer) * 60000;
      
      pauseTimeoutRef.current = setTimeout(async () => {
        await sendNotification(NotificationType.TIME_EXCEEDED, timerSettings.pauseTimer);
        await focusFinesseTab();
        startStatusCheck();
      }, countTimer);
    } else if (finesseState === "NOT_READY") {
      await sendNotification(NotificationType.NOT_READY);
      await focusFinesseTab();
    }
  };

  // Envio de notificações
  const sendNotification = async (type: NotificationType, additionalParam?: number) => {
    const message = notificationService.getMessage(type, additionalParam);
    const payload = {
      type,
      message,
      timestamp: new Date(),
      agentId: credentials?.agentId,
    };

    try {
      if (notificationConfig.windowsNotification) {
        await notificationService.sendWindowsNotification(payload);
      }

      if (notificationConfig.googleChatNotification && notificationConfig.googleChatWebhook) {
        await notificationService.sendGoogleChatNotification(
          notificationConfig.googleChatWebhook,
          payload
        );
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  };

  // Foco na aba do Finesse
  const focusFinesseTab = async () => {
    try {
      await finesseDetectorService.focusFinesseTab();
    } catch (error) {
      console.error('Erro ao focar aba do Finesse:', error);
    }
  };

  // Controle de verificações automáticas
  const startStatusCheck = useCallback(() => {
    stopStatusCheck();

    // Verificação inicial imediata
    checkAgentStatus();

    // Configurar verificação periódica
    intervalRef.current = setInterval(() => {
      checkAgentStatus();
    }, timerSettings.standardTimer * 60 * 1000);

    // Verificação mais rápida para tempo real (a cada 30 segundos)
    statusCheckRef.current = setInterval(() => {
      checkAgentStatus();
    }, 30000);
  }, [checkAgentStatus, timerSettings.standardTimer]);

  const stopStatusCheck = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    if (statusCheckRef.current) {
      clearInterval(statusCheckRef.current);
      statusCheckRef.current = null;
    }
  }, []);

  // Login com validações de segurança
  const login = async (loginCredentials: UserCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar se conta está bloqueada
      const locked = await storageService.isAccountLocked(loginCredentials.username);
      if (locked) {
        const securityConfig = storageService.getSecurityConfig();
        setIsAccountLocked(true);
        setError(`Conta bloqueada por ${securityConfig.lockoutDuration} minutos devido a muitas tentativas incorretas`);
        return false;
      }

      // Tentar login
      const response = await finesseService.connectApi(loginCredentials);
      
      if (response.success && response.data && response.data.firstName) {
        // Sucesso - salvar credenciais e configurações
        await Promise.all([
          storageService.saveCredentials(loginCredentials),
          storageService.recordLoginAttempt(true, loginCredentials.username)
        ]);

        setCredentials(loginCredentials);
        setAgentStatus(response.data);
        setIsConnected(true);
        setIsAccountLocked(false);
        setRemainingAttempts(3);
        
        startStatusCheck();
        return true;
      } else {
        // Falha - registrar tentativa
        await storageService.recordLoginAttempt(false, loginCredentials.username);
        
        const attempts = await storageService.getLoginAttempts(loginCredentials.username);
        const securityConfig = storageService.getSecurityConfig();
        const remaining = Math.max(0, securityConfig.maxLoginAttempts - attempts.count);
        
        setRemainingAttempts(remaining);
        setError(response.error || 'Credenciais inválidas');
        
        if (remaining === 0) {
          setIsAccountLocked(true);
        }
        
        return false;
      }
    } catch (err) {
      setError('Erro na tentativa de login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    stopStatusCheck();
    await storageService.removeCredentials();
    setCredentials(null);
    setAgentStatus(null);
    setIsConnected(false);
    setError(null);
    setIsAccountLocked(false);
    setRemainingAttempts(3);
  };

  // Alteração de estado do agente
  const changeAgentState = async (state: 'READY' | 'NOT_READY', reasonCodeId?: string): Promise<boolean> => {
    if (!credentials) return false;

    setIsLoading(true);
    try {
      const response = await finesseService.changeAgentState(credentials, state, reasonCodeId);
      
      if (response.success) {
        // Atualizar status imediatamente
        await checkAgentStatus(credentials);
        return true;
      } else {
        setError(response.error || 'Erro ao alterar status');
        return false;
      }
    } catch (err) {
      setError('Erro na alteração do status');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Obter códigos de motivo
  const getReasonCodes = async (): Promise<any[]> => {
    if (!credentials) return [];

    try {
      const response = await finesseService.getReasonCodes(credentials);
      return response.success ? response.data || [] : [];
    } catch (error) {
      console.error('Erro ao buscar códigos de motivo:', error);
      return [];
    }
  };

  // Atualizações de configurações
  const updateTimerSettings = async (settings: TimerSettings): Promise<boolean> => {
    const success = await storageService.saveTimerSettings(settings);
    if (success) {
      setTimerSettings(settings);
      // Reiniciar verificações com novo timer
      if (isConnected && credentials) {
        stopStatusCheck();
        setTimeout(startStatusCheck, 1000);
      }
    }
    return success;
  };

  const updateNotificationConfig = async (config: NotificationConfig): Promise<boolean> => {
    const success = await storageService.saveNotificationConfig(config);
    if (success) {
      setNotificationConfig(config);
    }
    return success;
  };

  const updateScheduleSettings = async (settings: ScheduleSettings): Promise<boolean> => {
    const success = await storageService.saveScheduleSettings(settings);
    if (success) {
      setScheduleSettings(settings);
    }
    return success;
  };

  const testNotification = async (): Promise<void> => {
    await sendNotification(NotificationType.NOT_READY);
  };

  const refreshStatus = async (): Promise<void> => {
    if (credentials) {
      await checkAgentStatus(credentials, true);
    }
  };

  // Monitoramento do status do Finesse
  useEffect(() => {
    const checkFinesseStatus = async () => {
      const isOpen = await finesseDetectorService.isFinesseOpen();
      setIsFinesseOpen(isOpen);
    };

    // Verificação inicial
    checkFinesseStatus();

    // Monitoramento de mudanças nas abas (apenas em extensões)
    finesseDetectorService.startTabMonitoring((isOpen) => {
      setIsFinesseOpen(isOpen);
    });

    // Verificação periódica como fallback
    const finesseInterval = setInterval(checkFinesseStatus, 60000); // A cada minuto

    return () => {
      clearInterval(finesseInterval);
    };
  }, []);

  // Inicialização da aplicação
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);

      try {
        // Carregar todas as configurações
        const [
          savedCredentials,
          savedTimerSettings,
          savedNotificationConfig,
          savedScheduleSettings
        ] = await Promise.all([
          storageService.getCredentials(),
          storageService.getTimerSettings(),
          storageService.getNotificationConfig(),
          storageService.getScheduleSettings()
        ]);

        // Aplicar configurações
        setTimerSettings(savedTimerSettings);
        setNotificationConfig(savedNotificationConfig);
        
        if (savedScheduleSettings) {
          setScheduleSettings(savedScheduleSettings);
        }

        // Se há credenciais salvas, tentar reconectar
        if (savedCredentials) {
          // Verificar se conta não está bloqueada
          const locked = await storageService.isAccountLocked(savedCredentials.username);
          if (locked) {
            setIsAccountLocked(true);
            await storageService.removeCredentials();
            setError('Sessão expirada por motivos de segurança');
          } else {
            setCredentials(savedCredentials);
            await checkAgentStatus(savedCredentials);
            startStatusCheck();
          }
        }
      } catch (err) {
        setError('Erro na inicialização da aplicação');
        console.error('Erro na inicialização:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();

    return () => {
      stopStatusCheck();
    };
  }, []);

  // Reiniciar monitoramento quando configurações mudam
  useEffect(() => {
    if (isConnected && credentials) {
      stopStatusCheck();
      setTimeout(startStatusCheck, 1000);
    }
  }, [timerSettings.standardTimer, scheduleSettings, isFinesseOpen]);

  return {
    agentStatus,
    isConnected,
    isLoading,
    error,
    credentials,
    timerSettings,
    notificationConfig,
    scheduleSettings,
    isFinesseOpen,
    isAccountLocked,
    remainingAttempts,
    login,
    logout,
    changeAgentState,
    updateTimerSettings,
    updateNotificationConfig,
    updateScheduleSettings,
    testNotification,
    refreshStatus,
    getReasonCodes,
  };
};