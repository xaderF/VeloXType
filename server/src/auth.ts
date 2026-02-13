import { createHmac, randomBytes, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';

const TOKEN_TTL_SHORT = 60 * 60 * 2;           // 2 hours  ("don't stay signed in")
const TOKEN_TTL_LONG  = 60 * 60 * 24 * 30;     // 30 days  ("stay signed in")
const REVOCATION_FILE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../data/revoked-tokens.json',
);

type TokenPayload = {
  sub: string;
  username: string;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
  remember: boolean;
};

export type AuthUser = {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
};

type RevokedTokenRecord = {
  hash: string;
  exp: number;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function getTokenSecret() {
  return env.AUTH_SECRET;
}

function getEmailHashSecret() {
  return env.EMAIL_HASH_KEY ?? env.AUTH_SECRET;
}

function sign(data: string) {
  return createHmac('sha256', getTokenSecret()).update(data).digest('base64url');
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [salt, expectedHash] = passwordHash.split(':');
  if (!salt || !expectedHash) return false;
  const actualHash = scryptSync(password, salt, 64).toString('hex');
  return safeEqual(actualHash, expectedHash);
}

export function createAuthToken(user: AuthUser, rememberMe = false) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = rememberMe ? TOKEN_TTL_LONG : TOKEN_TTL_SHORT;
  const payload: TokenPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    iat: now,
    exp: now + ttl,
    remember: rememberMe,
  };
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(`${header}.${encodedPayload}`);
  return `${header}.${encodedPayload}.${signature}`;
}

function parseTokenPayload(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = parts[1];
    const decoded = JSON.parse(base64UrlDecode(payload)) as Partial<TokenPayload>;
    if (
      typeof decoded.sub !== 'string' ||
      typeof decoded.username !== 'string' ||
      (decoded.role !== undefined && decoded.role !== 'USER' && decoded.role !== 'ADMIN') ||
      typeof decoded.exp !== 'number' ||
      typeof decoded.iat !== 'number'
    ) {
      return null;
    }
    return {
      sub: decoded.sub,
      username: decoded.username,
      role: decoded.role === 'ADMIN' ? 'ADMIN' : 'USER',
      iat: decoded.iat,
      exp: decoded.exp,
      remember: typeof decoded.remember === 'boolean' ? decoded.remember : false,
    };
  } catch {
    return null;
  }
}

function verifyAndDecodeToken(token: string): TokenPayload | null {
  if (isTokenRevoked(token)) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;
  const expectedSignature = sign(`${header}.${payload}`);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  const decoded = parseTokenPayload(token);
  if (!decoded) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp <= now) {
    return null;
  }

  return decoded;
}

export function verifyAuthToken(token: string): AuthUser | null {
  const decoded = verifyAndDecodeToken(token);
  if (!decoded) return null;
  return { id: decoded.sub, username: decoded.username, role: decoded.role };
}

export function getTokenRememberMe(token: string): boolean | null {
  const decoded = verifyAndDecodeToken(token);
  if (!decoded) return null;
  return decoded.remember;
}

export function getBearerToken(authorization?: string) {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

// ---------------------------------------------------------------------------
// Token revocation — persisted token-hash blacklist
// ---------------------------------------------------------------------------
const revokedTokenExp = new Map<string, number>();

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function pruneExpiredRevocations() {
  const now = Math.floor(Date.now() / 1000);
  for (const [hash, exp] of revokedTokenExp.entries()) {
    if (exp <= now) {
      revokedTokenExp.delete(hash);
    }
  }
}

function persistRevocations() {
  const dir = dirname(REVOCATION_FILE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const data: RevokedTokenRecord[] = Array.from(revokedTokenExp.entries()).map(([hash, exp]) => ({ hash, exp }));
  writeFileSync(REVOCATION_FILE_PATH, JSON.stringify(data), 'utf8');
}

function loadRevocations() {
  if (!existsSync(REVOCATION_FILE_PATH)) {
    return;
  }

  try {
    const raw = readFileSync(REVOCATION_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return;
    }

    for (const item of parsed) {
      if (
        typeof item === 'object' &&
        item !== null &&
        'hash' in item &&
        'exp' in item &&
        typeof (item as { hash: unknown }).hash === 'string' &&
        typeof (item as { exp: unknown }).exp === 'number'
      ) {
        revokedTokenExp.set((item as { hash: string }).hash, (item as { exp: number }).exp);
      }
    }
    pruneExpiredRevocations();
  } catch {
    // If revocation cache is corrupt, ignore it and continue safely.
  }
}

loadRevocations();

export function revokeToken(token: string) {
  const payload = parseTokenPayload(token);
  const exp = payload?.exp ?? Math.floor(Date.now() / 1000) + TOKEN_TTL_LONG;
  revokedTokenExp.set(tokenHash(token), exp);
  pruneExpiredRevocations();
  persistRevocations();
}

export function isTokenRevoked(token: string) {
  pruneExpiredRevocations();
  return revokedTokenExp.has(tokenHash(token));
}

// ---------------------------------------------------------------------------
// PII encryption helpers — AES-256-GCM at rest
// Used to pseudonymise email addresses in the database.
// ---------------------------------------------------------------------------
const AES_ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const PII_PREFIX = 'enc:';

function getPiiKey(): Buffer | null {
  const raw = env.PII_ENCRYPTION_KEY ?? env.AUTH_SECRET;
  // Derive a 32-byte key from whatever was provided
  return scryptSync(raw, 'veloxtype-pii-salt', 32);
}

export function encryptPii(plaintext: string): string {
  const key = getPiiKey();
  if (!key) throw new Error('PII encryption key unavailable');
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(AES_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // format: enc:<iv_hex>:<tag_hex>:<ciphertext_hex>
  return `${PII_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptPii(ciphertext: string): string {
  if (!ciphertext.startsWith(PII_PREFIX)) return ciphertext; // plaintext passthrough
  const key = getPiiKey();
  if (!key) return ciphertext;
  const parts = ciphertext.slice(PII_PREFIX.length).split(':');
  if (parts.length !== 3) return ciphertext;
  const [ivHex, tagHex, dataHex] = parts;
  try {
    const decipher = createDecipheriv(AES_ALGO, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return ciphertext;
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashEmailForLookup(email: string) {
  return createHmac('sha256', getEmailHashSecret())
    .update(normalizeEmail(email))
    .digest('hex');
}
