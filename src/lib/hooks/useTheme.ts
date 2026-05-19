'use client';

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'warm' | 'cream' | 'noir';
export type Accent = 'sage' | 'amber' | 'lilac' | 'sky';

export const THEMES: Theme[] = ['warm', 'cream', 'noir'];
export const ACCENTS: Accent[] = ['sage', 'amber', 'lilac', 'sky'];

const THEME_KEY = 'finance_theme';
const ACCENT_KEY = 'finance_accent';

const THEME_COLOR_META: Record<Theme, string> = {
  warm: '#211d18',
  cream: '#f5efe4',
  noir: '#0a0a0d',
};

function readFromDOM(): { theme: Theme; accent: Accent } {
  if (typeof document === 'undefined') return { theme: 'warm', accent: 'sage' };
  const root = document.documentElement;
  const theme =
    (THEMES.find((t) => root.classList.contains(`theme-${t}`)) as Theme | undefined) ?? 'warm';
  const accent =
    (ACCENTS.find((a) => root.classList.contains(`accent-${a}`)) as Accent | undefined) ?? 'sage';
  return { theme, accent };
}

function updateMetaThemeColor(theme: Theme) {
  if (typeof document === 'undefined') return;
  const tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (tag) tag.content = THEME_COLOR_META[theme];
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('warm');
  const [accent, setAccentState] = useState<Accent>('sage');

  useEffect(() => {
    const current = readFromDOM();
    setThemeState(current.theme);
    setAccentState(current.accent);
    updateMetaThemeColor(current.theme);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    THEMES.forEach((x) => root.classList.remove(`theme-${x}`));
    root.classList.add(`theme-${t}`);
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
    updateMetaThemeColor(t);
  }, []);

  const setAccent = useCallback((a: Accent) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    ACCENTS.forEach((x) => root.classList.remove(`accent-${x}`));
    root.classList.add(`accent-${a}`);
    setAccentState(a);
    try {
      localStorage.setItem(ACCENT_KEY, a);
    } catch {}
  }, []);

  return { theme, accent, setTheme, setAccent };
}

export const ACCENT_PREVIEW: Record<Accent, string> = {
  sage: 'oklch(0.80 0.12 145)',
  amber: 'oklch(0.82 0.13 80)',
  lilac: 'oklch(0.78 0.10 295)',
  sky: 'oklch(0.80 0.10 220)',
};
