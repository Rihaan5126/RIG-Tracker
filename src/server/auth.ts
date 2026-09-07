import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from './db';
import { config, secureCookies } from './config';
import { constantEqual, hash, randomToken } from './crypto';
import { AppError, Unauthorized } from '@/providers/instagram/exceptions';
import type { User } from '@/domain/models';
export interface Session {
  id: string;
  user: User;
  csrf: string;
}
export async function session(req: NextRequest): Promise<Session> {
  const token = req.cookies.get('rig_session')?.value;
  if (!token) throw new Unauthorized();
  const rows = await query<User & { session_id: string; csrf: string }>(
    'SELECT u.id,u.name,u.email,u.is_demo,s.id as session_id,s.csrf FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.expires_at>now()',
    [hash(token)],
  );
  const row = rows[0];
  if (!row) throw new Unauthorized();
  return {
    id: row.session_id,
    csrf: row.csrf,
    user: { id: row.id, name: row.name, email: row.email, is_demo: row.is_demo },
  };
}
export function requireOrigin(req: NextRequest) {
  if (req.headers.get('origin') !== new URL(config.APP_URL).origin)
    throw new AppError(
      'CSRF_REJECTED',
      'This request did not originate from your RIGtracker workspace.',
      403,
    );
}
export function csrf(req: NextRequest, s: Session) {
  requireOrigin(req);
  if (!constantEqual(req.headers.get('x-csrf-token') ?? '', s.csrf))
    throw new AppError('CSRF_REJECTED', 'Refresh the page and try again.', 403);
}
export async function createSession(user: User) {
  const token = randomToken(),
    csrfToken = randomToken();
  await query('INSERT INTO sessions(id,user_id,csrf,expires_at) VALUES($1,$2,$3,$4)', [
    hash(token),
    user.id,
    csrfToken,
    new Date(Date.now() + 7 * 86400000),
  ]);
  return { token, csrfToken };
}
export function setSessionCookies(response: NextResponse, token: string, csrfToken: string) {
  const options = { secure: secureCookies, sameSite: 'lax' as const, path: '/', maxAge: 7 * 86400 };
  response.cookies.set('rig_session', token, { ...options, httpOnly: true });
  response.cookies.set('rig_csrf', csrfToken, { ...options, httpOnly: false });
}
export async function createUser(
  name: string,
  email: string | null,
  password: string | null,
  isDemo = false,
) {
  const user: User = { id: randomUUID(), name, email, is_demo: isDemo };
  await query('INSERT INTO users(id,name,email,password_hash,is_demo) VALUES($1,$2,$3,$4,$5)', [
    user.id,
    name,
    email,
    password,
    isDemo,
  ]);
  return user;
}
