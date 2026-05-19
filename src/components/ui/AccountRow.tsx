'use client';

import { cn, dueRowLabel, type DebtStatusType } from '@/lib/utils';
import { NumMono } from './NumMono';
import { StatusPill } from './StatusPill';
import { CatPill, TypePill } from './CatPill';
import type { Debt, Entity } from '@/lib/types';

interface AccountRowProps {
  debt: Debt;
  dueDate: string;
  status: DebtStatusType;
  installmentInfo?: { current: number; total: number };
  entities: Entity[];
  onClick?: () => void;
  showType?: boolean;
}

export function AccountRow({
  debt,
  dueDate,
  status,
  installmentInfo,
  entities,
  onClick,
  showType = true,
}: AccountRowProps) {
  const debtEntities = debt.entityIds
    .map((id) => entities.find((e) => e.id === id))
    .filter(Boolean) as Entity[];

  const progressPct = installmentInfo
    ? Math.min(100, (installmentInfo.current / installmentInfo.total) * 100)
    : null;

  return (
    <div
      className={cn('row', status === 'atrasado' && 'row-atrasado')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="name">{debt.accountName}</div>
      <div className="amount">
        <NumMono value={debt.installmentValue} sign="neg" size={17} color="var(--ink)" />
      </div>
      <div className="meta">
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
          }}
        >
          {dueRowLabel(dueDate)}
        </span>
      </div>
      <div className="right-meta">
        <StatusPill status={status} />
      </div>
      {installmentInfo && progressPct !== null && (
        <>
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 10,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--ink-mute)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.04em',
              }}
            >
              PARCELA {installmentInfo.current}/{installmentInfo.total}
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--accent)',
                fontFamily: 'var(--f-mono)',
              }}
            >
              {Math.round(progressPct)}%
            </span>
          </div>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </>
      )}
      <div className="tags">
        {debtEntities.map((entity) => (
          <CatPill key={entity.id} entity={entity} />
        ))}
        {showType && (
          <TypePill
            kind={debt.isRecurring ? 'fixo' : 'parcelado'}
            total={!debt.isRecurring ? debt.numberOfInstallments : undefined}
          />
        )}
      </div>
    </div>
  );
}
