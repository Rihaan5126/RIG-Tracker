import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handled, ok, body } from '@/server/http';
import {
  createSession,
  createUser,
  csrf,
  requireOrigin,
  session,
  setSessionCookies,
} from '@/server/auth';
import { config } from '@/server/config';
import { hash, passwordHash, passwordMatches } from '@/server/crypto';
import { limit } from '@/server/cache';
import { query } from '@/server/db';
import { seedWorkspace } from '@/repositories/workspace';
import { AppError } from '@/providers/instagram/exceptions';
import type { User } from '@/domain/models';
import { oauthStart, oauthCallback } from '@/services/oauth';
const credentials = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.email().toLowerCase().max(254),
  password: z.string().min(12).max(128),
});
async function route(req: NextRequest) {
  return handled(req, async (id) => {
    const path = req.nextUrl.pathname.replace('/api/auth/', '');
    if (path === 'instagram/callback' && req.method === 'GET') return oauthCallback(req);
    if (path === 'session' && req.method === 'GET') {
      const s = await session(req);
      return ok({ user: s.user, csrf: s.csrf }, id);
    }
    if (req.method !== 'POST')
      throw new AppError('NOT_FOUND', 'Unknown authentication route.', 404);
    requireOrigin(req);
    const client =
      config.TRUST_PROXY === 'true'
        ? (req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local')
        : 'local';
    await limit(`auth:${hash(client)}`, 20, 60);
    if (path === 'instagram/start') {
      const s = await session(req);
      csrf(req, s);
      return ok(await oauthStart(s), id);
    }
    if (path === 'logout') {
      const s = await session(req);
      csrf(req, s);
      await query('DELETE FROM sessions WHERE id=$1', [s.id]);
      const r = ok({ signed_out: true }, id);
      r.cookies.delete('rig_session');
      r.cookies.delete('rig_csrf');
      return r;
    }
    let user: User;
    if (path === 'demo') {
      if (config.ALLOW_DEMO !== 'true' || config.INSTAGRAM_PROVIDER !== 'mock')
        throw new AppError('DEMO_DISABLED', 'Demo workspaces are disabled.', 403);
      user = await createUser('Demo workspace', null, null, true);
      try {
        await seedWorkspace(user);
      } catch (e) {
        await query('DELETE FROM users WHERE id=$1', [user.id]);
        throw e;
      }
    } else if (path === 'register' || path === 'login') {
      const input = credentials.parse(await body(req));
      if (path === 'register') {
        if (config.ALLOW_REGISTRATION !== 'true')
          throw new AppError('REGISTRATION_DISABLED', 'New registration is disabled.', 403);
        if ((await query('SELECT id FROM users WHERE email=$1', [input.email])).length)
          throw new AppError(
            'REGISTRATION_FAILED',
            'Could not register this email. Try signing in.',
            409,
          );
        user = await createUser(
          input.name ?? input.email.split('@')[0],
          input.email,
          passwordHash(input.password),
        );
        if (config.INSTAGRAM_PROVIDER === 'mock') await seedWorkspace(user);
      } else {
        const found = (
          await query<User & { password_hash: string }>(
            'SELECT id,name,email,is_demo,password_hash FROM users WHERE email=$1',
            [input.email],
          )
        )[0];
        const valid = passwordMatches(
          input.password,
          found?.password_hash ??
            '00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        );
        if (!found || !valid)
          throw new AppError('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
        user = { id: found.id, name: found.name, email: found.email, is_demo: found.is_demo };
      }
    } else throw new AppError('NOT_FOUND', 'Unknown authentication route.', 404);
    const { token, csrfToken } = await createSession(user),
      r = ok({ user }, id);
    setSessionCookies(r, token, csrfToken);
    return r;
  });
}
export const GET = route;
export const POST = route;
