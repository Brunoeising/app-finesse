// app/layout.tsx
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Finesse Notifier',
  description: 'Sistema de monitoramento para Cisco Finesse com notificações inteligentes',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon16.png',
    apple: '/icons/icon128.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="description" content="Sistema de monitoramento para Cisco Finesse com notificações inteligentes" />
        <link rel="icon" href="/icons/icon16.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}