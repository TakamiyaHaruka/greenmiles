import { SignJWT, jwtVerify } from 'jose';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface JwtPayload {
  userId: number;
  email: string;
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the session token from an incoming request's cookie
 * header. API route handlers use this instead of hand-rolling cookie parsing.
 */
export async function getAuthUser(request: Request): Promise<JwtPayload | null> {
  const token = request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1];
  if (!token) return null;
  return verifyJwt(token);
}

/**
 * Admin console session (minimal PRD FR3 implementation).
 * The admin console is gated by ADMIN_PASSWORD, not a user account.
 */
export async function signAdminJwt(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyAdminJwt(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}
