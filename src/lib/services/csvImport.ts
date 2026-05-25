/**
 * Light CSV parser + Income builder. Avoids a third-party dep so the
 * Electron bundle doesn't grow for this. Handles BRL number formats
 * (1.234,56) and the most common bank exports.
 */

import { parseMoney } from '@/lib/utils';
import type { Income } from '@/lib/types';

export interface ParsedCsvRow {
  raw: string[];
  date: string | null; // YYYY-MM-DD or null if no parsable date
  description: string;
  amount: number; // positive value
  direction: 'entrada' | 'saida';
}

/**
 * Minimal CSV tokenizer — splits on commas / semicolons, honors double
 * quotes, allows escaped "" inside quoted fields. No support for embedded
 * newlines inside quoted fields (rare in bank exports).
 */
export function parseCsvText(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  // Auto-detect separator: pick whichever of , or ; appears more in line 0.
  const head = lines[0]!;
  const sep = (head.match(/;/g)?.length ?? 0) > (head.match(/,/g)?.length ?? 0) ? ';' : ',';

  return lines.map((line) => parseCsvLine(line, sep));
}

function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === sep) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const DATE_PATTERNS: { re: RegExp; iso: (m: RegExpMatchArray) => string }[] = [
  // 2024-05-30
  { re: /^(\d{4})-(\d{2})-(\d{2})/, iso: (m) => `${m[1]}-${m[2]}-${m[3]}` },
  // 30/05/2024 or 30-05-2024
  { re: /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/, iso: (m) => `${m[3]}-${m[2]}-${m[1]}` },
  // 30/05/24
  {
    re: /^(\d{2})[\/\-](\d{2})[\/\-](\d{2})$/,
    iso: (m) => `20${m[3]}-${m[2]}-${m[1]}`,
  },
];

function tryParseDate(s: string): string | null {
  const trimmed = s.trim();
  for (const { re, iso } of DATE_PATTERNS) {
    const m = trimmed.match(re);
    if (m) return iso(m);
  }
  return null;
}

/**
 * Map heterogeneous CSV rows into ParsedCsvRow. Heuristics:
 *  - skip the header row (first row of mostly non-numeric, non-date cells)
 *  - pick the first column that parses as a date
 *  - pick the last column that parses as a non-zero money value
 *  - everything between is description (joined with " · ")
 *  - negative amount = saída, positive = entrada
 */
export function rowsToTransactions(rows: string[][]): ParsedCsvRow[] {
  if (rows.length === 0) return [];
  const out: ParsedCsvRow[] = [];

  // Skip first row if it looks like a header (no parsable date and no money).
  let startIdx = 0;
  const first = rows[0]!;
  const headerLikely =
    !first.some((c) => tryParseDate(c)) ||
    first.every((c) => !/[\d,.-]/.test(c));
  if (headerLikely) startIdx = 1;

  for (let r = startIdx; r < rows.length; r++) {
    const row = rows[r]!;
    if (row.every((c) => c.trim() === '')) continue;

    let dateIdx = -1;
    let date: string | null = null;
    for (let c = 0; c < row.length; c++) {
      const parsed = tryParseDate(row[c]!);
      if (parsed) {
        date = parsed;
        dateIdx = c;
        break;
      }
    }

    let amountIdx = -1;
    let amount = 0;
    for (let c = row.length - 1; c >= 0; c--) {
      const v = parseMoney(row[c]!);
      // Bank rows often have empty/garbage cols at the end; pick the
      // rightmost non-zero numeric that has a digit.
      if (v !== 0 && /\d/.test(row[c]!)) {
        amount = v;
        amountIdx = c;
        break;
      }
    }

    if (!date || amountIdx === -1) continue;

    const descrParts: string[] = [];
    for (let c = 0; c < row.length; c++) {
      if (c === dateIdx || c === amountIdx) continue;
      const v = row[c]!.trim();
      if (v) descrParts.push(v);
    }

    out.push({
      raw: row,
      date,
      description: descrParts.join(' · ') || '(sem descrição)',
      amount: Math.abs(amount),
      direction: amount < 0 ? 'saida' : 'entrada',
    });
  }

  return out;
}

/**
 * Build Income rows from parsed CSV rows, deduping against existing
 * incomes by (date, amount, description) signature.
 */
export function buildIncomesFromCsv(
  parsed: ParsedCsvRow[],
  existingIncomes: Income[]
): { incomes: Income[]; skipped: number } {
  const seen = new Set(
    existingIncomes.map(
      (i) => `${i.date}|${i.amount.toFixed(2)}|${i.description.toLowerCase()}`
    )
  );
  const out: Income[] = [];
  let skipped = 0;
  const nowISO = new Date().toISOString();
  for (const r of parsed) {
    if (!r.date) continue;
    const sig = `${r.date}|${r.amount.toFixed(2)}|${r.description.toLowerCase()}`;
    if (seen.has(sig)) {
      skipped++;
      continue;
    }
    seen.add(sig);
    out.push({
      id: `csv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: r.description,
      amount: r.amount,
      date: r.date,
      direction: r.direction,
      createdAt: nowISO,
    });
  }
  return { incomes: out, skipped };
}
