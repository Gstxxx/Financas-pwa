import type { Metadata, Viewport } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { FinanceProvider } from '@/lib/contexts/FinanceContext';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { TitleBar } from '@/components/layout/TitleBar';
import { NotificationScheduler } from '@/components/layout/NotificationScheduler';
import { PinGate } from '@/components/layout/PinGate';
import { PWARegister } from '@/components/layout/PWARegister';
import { SplashKiller } from '@/components/layout/SplashKiller';
import { UpdaterProvider } from '@/lib/contexts/UpdaterContext';
import { UpdateModal } from '@/components/updater/UpdateModal';
import '@/styles/globals.css';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '';

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
  themeColor: '#15171b',
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

// Inlined splash styles so they paint before React/CSS-bundle loads. The
// markup lives in the body below; SplashKiller fades it out post-mount.
const splashStyles = `
  #app-splash {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #15171b;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    transition: opacity 0.4s ease;
    color: #e8e4d8;
  }
  #app-splash.fade-out { opacity: 0; pointer-events: none; }
  #app-splash .wordmark {
    font-family: 'Instrument Serif', Georgia, serif;
    font-style: italic;
    font-size: 56px;
    line-height: 1;
    letter-spacing: -0.02em;
    color: #f4f0e6;
  }
  #app-splash .tagline {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 10.5px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(232, 228, 216, 0.45);
    margin-top: -8px;
  }
  #app-splash .spinner {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1.5px solid rgba(232, 228, 216, 0.15);
    border-top-color: rgba(232, 228, 216, 0.7);
    animation: splash-spin 0.85s linear infinite;
  }
  #app-splash .version {
    position: absolute;
    bottom: 22px;
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 10.5px;
    letter-spacing: 0.04em;
    color: rgba(232, 228, 216, 0.3);
  }
  @keyframes splash-spin {
    to { transform: rotate(360deg); }
  }
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
        <style dangerouslySetInnerHTML={{ __html: splashStyles }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <div id="app-splash" aria-hidden="true">
          <div className="wordmark">Financas</div>
          <div className="tagline">Carregando suas finanças</div>
          <div className="spinner" />
          {APP_VERSION && <div className="version">v{APP_VERSION}</div>}
        </div>
        <SplashKiller />
        <TitleBar />
        <PinGate>
          <UpdaterProvider>
            <FinanceProvider>
              <ToastProvider>
                <NotificationScheduler />
                {children}
                <BottomNav />
                <PWARegister />
                <UpdateModal />
              </ToastProvider>
            </FinanceProvider>
          </UpdaterProvider>
        </PinGate>
      </body>
    </html>
  );
}
