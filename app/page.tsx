'use client';

// app/page.tsx
import React from 'react';
import { useFinesse } from '@/hooks/useFinesse';
import { LoginForm } from '@/components/LoginForm';
import { AgentStatus } from '@/components/AgentStatus';
import { StateChanger } from '@/components/StateChanger';
import { TimerSettingsComponent } from '@/components/TimerSettings';
import { NotificationConfigComponent } from '@/components/NotificationConfig';
import { ScheduleConfig } from '@/components/ScheduleConfig';
import { Header } from '@/components/Header';

export default function Home() {
  const {
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
  } = useFinesse();

  const handleExternalLinks = {
    openDocs: () => window.open('https://tdn.totvs.com/pages/viewpage.action?pageId=961629221', '_blank'),
    openStore: () => window.open('https://chromewebstore.google.com/detail/finesse-notifier/cglkkcedledghdpkbopambajgmjmkkab', '_blank'),
    openFeedback: () => window.open('https://docs.google.com/forms/d/e/1FAIpQLSeeMiF6LywX6OfRddaWB1igSbn0TylLtRUy28AFWNP4KpC4iA/viewform?usp=dialog', '_blank'),
  };

  const getAgentName = () => {
    if (!agentStatus || !agentStatus.firstName || !agentStatus.lastName) return undefined;
    return `${agentStatus.firstName.text} ${agentStatus.lastName.text}`;
  };

  // Loading screen
  if (isLoading && !credentials) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!credentials) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <LoginForm
              onLogin={login}
              isLoading={isLoading}
              error={error}
              isAccountLocked={isAccountLocked}
              remainingAttempts={remainingAttempts}
            />
          </div>
        </div>
      </div>
    );
  }

  // Main application
  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        agentName={getAgentName()}
        onLogout={logout}
        onOpenDocs={handleExternalLinks.openDocs}
        onOpenStore={handleExternalLinks.openStore}
        onOpenFeedback={handleExternalLinks.openFeedback}
      />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Status do Finesse */}
          {!isFinesseOpen && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Finesse não detectado
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      O Finesse não está aberto ou não foi detectado. As notificações estão suspensas até que o Finesse seja aberto.
                    </p>
                  </div>
                  <div className="mt-4">
                    <div className="-mx-2 -my-1.5 flex">
                      <button
                        onClick={handleExternalLinks.openDocs}
                        className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
                      >
                        Abrir Finesse
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status do Agente */}
          <AgentStatus
            status={agentStatus}
            isConnected={isConnected}
            onRefresh={refreshStatus}
            isLoading={isLoading}
          />

          {/* Alteração de Estado */}
          {credentials && (
            <StateChanger
              currentState={agentStatus?.state?.text}
              onStateChange={changeAgentState}
              getReasonCodes={getReasonCodes}
            />
          )}

          {/* Configuração de Horários */}
          <ScheduleConfig
            settings={scheduleSettings}
            onUpdate={updateScheduleSettings}
          />

          {/* Configurações de Timer */}
          <TimerSettingsComponent
            settings={timerSettings}
            onUpdate={updateTimerSettings}
          />

          {/* Configurações de Notificação */}
          <NotificationConfigComponent
            config={notificationConfig}
            onUpdate={updateNotificationConfig}
            onTest={testNotification}
          />

          {/* Erro geral */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erro no sistema
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Por Rafael Arcanjo © TOTVS</span>
            <div className="flex items-center space-x-4">
              <span>v2.0.0</span>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs">
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}