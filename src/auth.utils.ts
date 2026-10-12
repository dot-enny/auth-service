import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? '';

if (!ACCESS_TOKEN_SECRET) {
  throw new Error('ACCESS_TOKEN_SECRET must be set.');
}
const ACCESS_TOKEN_EXPIRY = '15m';

export interface TokenPayload {
  userId: number;
  role: string;
}

// 1. Password Hashing via Argon2id
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id, // Hybrid defense against side-channel and GPU-based attacks
    memoryCost: 2 ** 16,   // 64 MB RAM
    timeCost: 3,           // 3 iterations
    parallelism: 1,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// 2. Short-lived Access Token (JWT)
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// 3. Cryptographically Secure Refresh Token (Opaque String)
export function generateRefreshToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(40).toString('hex');
  // Store only the SHA-256 hash in PostgreSQL to prevent credential leaks
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}