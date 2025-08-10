import crypto from 'crypto';

type SessionPayload = {
  address: string;
  exp: number; // epoch seconds
};

function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    // Fallback for local dev to avoid crashes
    return 'dev-secret-please-set-NEXTAUTH_SECRET';
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signSession(payload: SessionPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const toSign = `${headerB64}.${payloadB64}`;
  const hmac = crypto.createHmac('sha256', getAuthSecret());
  hmac.update(toSign);
  const sig = base64url(hmac.digest());
  return `${toSign}.${sig}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [headerB64, payloadB64, sig] = token.split('.');
    if (!headerB64 || !payloadB64 || !sig) return null;
    const toSign = `${headerB64}.${payloadB64}`;
    const hmac = crypto.createHmac('sha256', getAuthSecret());
    hmac.update(toSign);
    const expectedSig = base64url(hmac.digest());
    if (sig !== expectedSig) return null;
    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64').toString('utf8')
    );
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export function createSessionToken(address: string, ttlSeconds = 60 * 60 * 24 * 30): string {
  const payload: SessionPayload = {
    address: address.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  return signSession(payload);
}

export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((pair) => {
    const [rawKey, ...rest] = pair.trim().split('=');
    if (!rawKey) return;
    const key = rawKey.trim();
    const value = decodeURIComponent(rest.join('='));
    cookies[key] = value;
  });
  return cookies;
}

export async function verifyWalletAuth(request: Request): Promise<string | null> {
  const cookies = parseCookies(request);
  const token = cookies['session'];
  if (!token) return null;
  const payload = verifySessionToken(token);
  return payload?.address ?? null;
}

export function createCookie(name: string, value: string, options: {
  httpOnly?: boolean;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  maxAge?: number; // seconds
} = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  parts.push(`Path=${options.path || '/'}`);
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.secure !== false) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(name: string) {
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure`;
}