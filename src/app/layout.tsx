import type { Metadata, Viewport } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { FinanceProvider } from '@/lib/contexts/FinanceContext';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { PWARegister } from '@/components/layout/PWARegister';
import '@/styles/globals.css';

const serif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-display',
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
  themeColor: '#211d18',
};

const themeInitScript = `
  (function() {
    try {
      var t = localStorage.getItem('finance_theme') || 'warm';
      var a = localStorage.getItem('finance_accent') || 'sage';
      var h = document.documentElement;
      h.classList.add('theme-' + t, 'accent-' + a);
    } catch (e) {
      document.documentElement.classList.add('theme-warm', 'accent-sage');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
