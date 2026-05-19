'use client';

import Link from 'next/link';
import { I } from '@/components/icons/I';

interface PageHeadProps {
  overline: string;
  title: string;
  right?: React.ReactNode;
  backHref?: string;
}

export function PageHead({ overline, title, right, backHref }: PageHeadProps) {
  return (
    <header className="page-head">
      <div>
        <div className="eyebrow">
          {backHref ? (
            <Link
              href={backHref}
              className="btn btn-ghost"
              style={{ padding: 6, height: 28, width: 28, borderRadius: 99 }}
              aria-label="Voltar"
            >
              <I.chevL size={13} color="var(--ink-mid)" />
            </Link>
          ) : (
            <span className="dot" />
          )}
          <span className="t-overline">{overline}</span>
        </div>
        <h1 className="t-h1">{title}</h1>
      </div>
      {right}
    </header>
  );
}
