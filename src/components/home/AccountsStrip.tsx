'use client';

import Link from 'next/link';
import { useFinanceData } from '@/lib/contexts/FinanceContext';
import { NumMono } from '@/components/ui/NumMono';
import { getEntityHue, getInitialGlyph, fmtBRL } from '@/lib/utils';

/**
 * Compact list of the user's accounts with their current balances. Hidden
 * when the migration only produced the single "Conta principal" — there's
 * no breakdown worth showing in that case.
 */
export function AccountsStrip() {
  const { isHydrated, accounts } = useFinanceData();

  if (!isHydrated) return null;

  const visible = accounts.filter((a) => !a.archived);
  if (visible.length < 2) return null;

  const total = visible.reduce((s, a) => s + (a.currentBalance || 0), 0);

  return (
    <div style={{ padding: '0 22px 14px' }}>
      <Link
        href="/accounts"
        className="card-flat"
        style={{
          padding: '14px 16px',
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 10,
          }}
        >
          <span className="t-overline">Carteiras</span>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              color: 'var(--ink-mute)',
            }}
          >
            total <span style={{ color: 'var(--ink)' }}>{fmtBRL(total)}</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {visible.map((account) => {
            const hue = getEntityHue(account);
            const glyph = getInitialGlyph(account.name);
            return (
              <div
                key={account.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px 6px 6px',
                  background: 'var(--surface)',
                  border: '1px solid var(--hair)',
                  borderRadius: 99,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 99,
                    background: `oklch(0.26 0.05 ${hue})`,
                    color: `oklch(0.85 0.10 ${hue})`,
                    fontSize: glyph.isEmoji ? 12 : 11,
                    fontWeight: glyph.isEmoji ? 400 : 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {glyph.value}
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink-mid)' }}>{account.name}</span>
                <NumMono
                  value={account.currentBalance}
                  size={12}
                  sign={account.currentBalance < 0 ? 'neg' : false}
                  color={account.currentBalance < 0 ? 'var(--neg)' : undefined}
                />
              </div>
            );
          })}
        </div>
      </Link>
    </div>
  );
}
