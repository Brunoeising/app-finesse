// components/Header.tsx
import React, { useState } from 'react';

interface HeaderProps {
  agentName?: string;
  onLogout: () => void;
  onOpenDocs: () => void;
  onOpenStore: () => void;
  onOpenFeedback: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  agentName,
  onLogout,
  onOpenDocs,
  onOpenStore,
  onOpenFeedback
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold">Finesse Notifier</h1>
            </div>
            {agentName && (
              <div className="ml-4 text-sm">
                Olá, {agentName}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={toggleMenu}
              className="bg-blue-500 hover:bg-blue-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-600 focus:ring-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <button
                  onClick={onOpenDocs}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Documentação
                </button>
                <button
                  onClick={onOpenStore}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Chrome Web Store
                </button>
                <button
                  onClick={onOpenFeedback}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Enviar Feedback
                </button>
                <div className="border-t border-gray-100"></div>
                <button
                  onClick={onLogout}
                  className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};