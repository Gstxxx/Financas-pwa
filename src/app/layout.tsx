import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { FinanceProvider } from '@/lib/contexts/FinanceContext';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { PWARegister } from '@/components/layout/PWARegister';
import '@/styles/globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dashboard Financeiro',
  description: 'Seu dashboard financeiro pessoal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Financas',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: false,
  themeColor: '#08080c',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${GeistSans.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body className="font-sans">
        <FinanceProvider>
          <ToastProvider>
            {children}
            <BottomNav />
            <PWARegister />
          </ToastProvider>
        </FinanceProvider>
      </body>
    </html>
  );
}
