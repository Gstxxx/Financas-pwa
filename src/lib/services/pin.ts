/**
 * Local PIN management. Uses Web Crypto for SHA-256 + a per-install salt
 * so the stored hash isn't a rainbow-table victim. This is *not* defense
 * against a determined attacker with disk access — for that we'd need to
 * encrypt the SQLite/localStorage payload too. This protects against
 * casual access (someone opens your laptop while you're getting coffee).
 */

export interface StoredPin {
  salt: string;
  hash: string;
  version: 1;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return bytesToHex(new Uint8Array(buf));
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}:${pin}`);
}

export async function makeStoredPin(pin: string): Promise<StoredPin> {
  const salt = randomSalt();
  const hash = await hashPin(pin, salt);
  return { salt, hash, version: 1 };
}

export async function verifyPin(pin: string, stored: StoredPin): Promise<boolean> {
  const candidate = await hashPin(pin, stored.salt);
  return candidate === stored.hash;
}

export function isPinValid(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}
