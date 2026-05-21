import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

let db: Database.Database | null = null;

function getDbPath(): string {
  const dir = app.getPath('userData');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'financas.sqlite');
}

export function initDb(): void {
  if (db) return;
  const file = getDbPath();
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const version =
    (db.prepare('SELECT value FROM schema_meta WHERE key = ?').get('version') as { value: string } | undefined)
      ?.value ?? '0';

  if (version === '0') {
    db.prepare('INSERT OR REPLACE INTO schema_meta (key, value) VALUES (?, ?)').run('version', '1');
  }
}

function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialized — call initDb() first');
  return db;
}

export function kvGetRaw(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM kv WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function kvSetRaw(key: string, rawValue: string): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(key, rawValue, now);
}

export function kvDelete(key: string): void {
  getDb().prepare('DELETE FROM kv WHERE key = ?').run(key);
}

export function kvLoadAll(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM kv').all() as Array<{
    key: string;
    value: string;
  }>;
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function kvReset(): void {
  getDb().prepare('DELETE FROM kv').run();
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
