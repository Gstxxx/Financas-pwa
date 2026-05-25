'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { I, type IconKey } from '@/components/icons/I';

interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/home',         label: 'Home',       icon: 'home' },
  { href: '/debts',        label: 'Contas',     icon: 'list' },
  { href: '/accounts',     label: 'Carteiras',  icon: 'wallet' },
  { href: '/entities',     label: 'Categorias', icon: 'folder' },
  { href: '/analysis',     label: 'Análise',    icon: 'chart' },
  { href: '/openfinance',  label: 'Banco',      icon: 'bank' },
  { href: '/chat',         label: 'Chat',       icon: 'spark' },
  { href: '/profile',      label: 'Perfil',     icon: 'gear' },
];

// Baked at build time by next.config.mjs -> env.NEXT_PUBLIC_APP_VERSION.
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="Navegação principal">
      <div className="tabbar-inner">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href) ?? false;
          const Icon = I[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('tab', isActive && 'active')}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} color="currentColor" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      {APP_VERSION && (
        <div className="tabbar-version" aria-label={`Versão ${APP_VERSION}`}>
          v{APP_VERSION}
        </div>
      )}
    </nav>
  );
}
