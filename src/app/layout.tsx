import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { FinanceProvider } from '@/lib/contexts/FinanceContext';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { PWARegister } from '@/components/layout/PWARegister';
import '@/styles/globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
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
      className={`${GeistSans.variable} ${bricolage.variable} ${jetbrains.variable}`}
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
