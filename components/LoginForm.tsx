// components/LoginForm.tsx
import React, { useState } from 'react';
import { UserCredentials } from '@/types/finesse';

interface LoginFormProps {
  onLogin: (credentials: UserCredentials) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  isAccountLocked: boolean;
  remainingAttempts: number;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onLogin, 
  isLoading, 
  error, 
  isAccountLocked, 
  remainingAttempts 
}) => {
  const [formData, setFormData] = useState<UserCredentials>({
    username: '',
    password: '',
    agentId: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAccountLocked) {
      return;
    }

    if (!formData.username || !formData.password || !formData.agentId) {
      return;
    }

    await onLogin(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    
    // Para Agent ID, permitir apenas números e pontos, mas não forçar formatação
    if (name === 'agentId') {
      // Permitir apenas números e pontos
      processedValue = value.replace(/[^0-9.]/g, '');
      // Limitar a 11 caracteres (xx.xxx.xxx)
      if (processedValue.length > 11) {
        processedValue = processedValue.substring(0, 11);
      }
    }

    if (name === 'username') {
      processedValue = value.toLowerCase().trim();
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-xl rounded-lg px-8 pt-6 pb-8 mb-4">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Finesse Notifier</h2>
          <p className="text-gray-600 mt-2">Entre com suas credenciais</p>
          {isAccountLocked && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="text-sm font-medium">Conta temporariamente bloqueada</p>
              <p className="text-xs mt-1">Tente novamente em alguns minutos</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
              Email corporativo:
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline border-gray-300"
              id="username"
              name="username"
              type="email"
              placeholder="nome.sobrenome@jv01.local"
              value={formData.username}
              onChange={handleInputChange}
              disabled={isLoading || isAccountLocked}
              autoComplete="username"
              required
            />
          </div>

          {/* Agent ID */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="agentId">
              ID do Agente:
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline border-gray-300"
              id="agentId"
              name="agentId"
              type="text"
              placeholder="80.590.269"
              value={formData.agentId}
              onChange={handleInputChange}
              disabled={isLoading || isAccountLocked}
              maxLength={11}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Digite apenas números ou no formato XX.XXX.XXX
            </p>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Senha:
            </label>
            <div className="relative">
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline border-gray-300"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading || isAccountLocked}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isLoading || isAccountLocked}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Erro geral */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <div className="flex items-center">
                <svg className="h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium">Erro no login:</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tentativas restantes */}
          {!isAccountLocked && remainingAttempts < 10 && remainingAttempts > 0 && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              <p className="text-sm">
                Tentativas restantes: <strong>{remainingAttempts}</strong>
              </p>
            </div>
          )}

          {/* Botão de login */}
          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              type="submit"
              disabled={isLoading || isAccountLocked}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Conectando...
                </div>
              ) : (
                'Entrar'
              )}
            </button>
          </div>
        </form>


        {/* Informações */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h5 className="text-sm font-medium text-blue-900 mb-2">Dicas importantes:</h5>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use suas credenciais normais do Finesse</li>
            <li>• Agent ID deve ser com ou pontos (ex: 80.590.269)</li>
            <li>• Verifique se está conectado na VPN</li>
            <li>• Certifique-se que o Jabber está funcionando</li>
          </ul>
        </div>
      </div>
    </div>
  );
};