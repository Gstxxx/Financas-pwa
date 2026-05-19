'use client';

import { PageHead } from '@/components/ui/PageHead';
import { getGreeting } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

/** Legacy shim. New code should use PageHead directly. */
export function Header({ title = 'Suas finanças', subtitle, rightAction }: HeaderProps) {
  const overline = subtitle || getGreeting();
  return <PageHead overline={overline} title={title} right={rightAction} />;
}
