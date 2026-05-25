/**
 * Tiny markdown → React subset. Just enough for our changelogs:
 *   # H1, ## H2, ### H3
 *   - bullet, * bullet
 *   **bold**, *em*, `code`
 *   [text](url)
 *   blank line → paragraph break
 *   --- → hr
 *
 * Skips: tables, images, blockquotes, code blocks. The changelog body is
 * always under our control so we know what it supports.
 */

import { Fragment, type ReactNode } from 'react';

type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'em'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'link'; text: string; href: string };

function tokenizeInline(input: string): InlineToken[] {
  const out: InlineToken[] = [];
  let i = 0;
  let buf = '';
  const flush = () => {
    if (buf) {
      out.push({ kind: 'text', value: buf });
      buf = '';
    }
  };

  while (i < input.length) {
    const ch = input[i]!;

    // [text](url)
    if (ch === '[') {
      const end = input.indexOf('](', i);
      if (end !== -1) {
        const close = input.indexOf(')', end + 2);
        if (close !== -1) {
          flush();
          out.push({
            kind: 'link',
            text: input.slice(i + 1, end),
            href: input.slice(end + 2, close),
          });
          i = close + 1;
          continue;
        }
      }
    }

    // `code`
    if (ch === '`') {
      const close = input.indexOf('`', i + 1);
      if (close !== -1) {
        flush();
        out.push({ kind: 'code', value: input.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    }

    // **bold**
    if (ch === '*' && input[i + 1] === '*') {
      const close = input.indexOf('**', i + 2);
      if (close !== -1) {
        flush();
        out.push({ kind: 'bold', value: input.slice(i + 2, close) });
        i = close + 2;
        continue;
      }
    }

    // *em*  (single * not adjacent to space)
    if (ch === '*' && input[i + 1] !== ' ' && input[i + 1] !== '*') {
      const close = input.indexOf('*', i + 1);
      if (close !== -1 && input[close - 1] !== ' ') {
        flush();
        out.push({ kind: 'em', value: input.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    }

    buf += ch;
    i++;
  }
  flush();
  return out;
}

function renderInline(input: string, keyPrefix: string): ReactNode[] {
  return tokenizeInline(input).map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (tok.kind) {
      case 'text':
        return <Fragment key={key}>{tok.value}</Fragment>;
      case 'bold':
        return <strong key={key}>{tok.value}</strong>;
      case 'em':
        return <em key={key}>{tok.value}</em>;
      case 'code':
        return (
          <code
            key={key}
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: '0.9em',
              background: 'var(--surface-2)',
              border: '1px solid var(--hair-soft)',
              borderRadius: 4,
              padding: '1px 5px',
            }}
          >
            {tok.value}
          </code>
        );
      case 'link':
        return (
          <a
            key={key}
            href={tok.href}
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}
          >
            {tok.text}
          </a>
        );
    }
  });
}

export function renderMarkdown(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];

  let bulletGroup: string[] | null = null;
  let paragraphLines: string[] | null = null;

  const flushBullets = (key: string) => {
    if (!bulletGroup) return;
    const items = bulletGroup;
    blocks.push(
      <ul key={`ul-${key}`} style={ulStyle}>
        {items.map((item, i) => (
          <li key={`${key}-${i}`} style={liStyle}>
            <span style={bulletDot} aria-hidden>•</span>
            {renderInline(item, `${key}-${i}`)}
          </li>
        ))}
      </ul>
    );
    bulletGroup = null;
  };

  const flushParagraph = (key: string) => {
    if (!paragraphLines) return;
    const joined = paragraphLines.join(' ');
    blocks.push(
      <p key={`p-${key}`} style={pStyle}>
        {renderInline(joined, `p-${key}`)}
      </p>
    );
    paragraphLines = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const key = String(idx);

    if (line === '') {
      flushBullets(key);
      flushParagraph(key);
      return;
    }
    if (line === '---') {
      flushBullets(key);
      flushParagraph(key);
      blocks.push(<hr key={`hr-${key}`} style={hrStyle} />);
      return;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushBullets(key);
      flushParagraph(key);
      const level = h[1].length;
      const text = h[2];
      const Tag = (level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4') as 'h2' | 'h3' | 'h4';
      blocks.push(
        <Tag key={`h-${key}`} style={headingStyles[level - 1]}>
          {renderInline(text, `h-${key}`)}
        </Tag>
      );
      return;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph(key);
      if (!bulletGroup) bulletGroup = [];
      bulletGroup.push(bullet[1]);
      return;
    }

    // Plain paragraph line
    flushBullets(key);
    if (!paragraphLines) paragraphLines = [];
    paragraphLines.push(line);
  });

  flushBullets('end');
  flushParagraph('end');

  return blocks;
}

const headingStyles: React.CSSProperties[] = [
  { fontSize: 18, fontWeight: 600, color: 'var(--ink)', margin: '14px 0 8px', letterSpacing: '-0.01em' },
  { fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '14px 0 6px', letterSpacing: '-0.005em' },
  { fontSize: 13, fontWeight: 600, color: 'var(--ink-mid)', margin: '12px 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' },
];

const pStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.55,
  color: 'var(--ink-mid)',
  margin: '6px 0',
};

const ulStyle: React.CSSProperties = {
  paddingInlineStart: 18,
  margin: '6px 0',
  listStyle: 'none',
};

const liStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.55,
  color: 'var(--ink-mid)',
  margin: '4px 0',
  paddingLeft: 14,
  position: 'relative',
};

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--hair-soft)',
  margin: '14px 0',
};

const bulletDot: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  color: 'var(--accent)',
  fontSize: 16,
  lineHeight: '1.55',
};
