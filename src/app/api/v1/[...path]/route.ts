import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { handled, ok, body } from '@/server/http';
import { session, csrf } from '@/server/auth';
import { limit } from '@/server/cache';
import { database, query } from '@/server/db';
import {
  getWorkspace,
  getProfile,
  getHistory,
  getEvents,
  getMedia,
  getTracked,
  getSaved,
  getConnections,
} from '@/repositories/workspace';
import { inspectLink } from '@/services/links';
import { refreshProfile } from '@/services/tracking';
import { AppError, ProfileNotFound, UnsupportedCapability } from '@/providers/instagram/exceptions';
import { TAGS } from '@/domain/models';
import { growth, growthSummary, mediaAnalytics } from '@/domain/analytics';
const username = z
  .string()
  .regex(/^@?[A-Za-z0-9_.]{1,30}$/)
  .transform((s) => s.replace(/^@/, '').toLowerCase());
async function route(req: NextRequest) {
  return handled(req, async (requestId) => {
    const s = await session(req);
    await limit(`api:${s.user.id}`, 180, 60);
    if (!['GET', 'HEAD'].includes(req.method)) csrf(req, s);
    const path = req.nextUrl.pathname.replace('/api/v1/', '').split('/').map(decodeURIComponent),
      method = req.method,
      userId = s.user.id;
    if (path[0] === 'workspace' && method === 'GET')
      return ok(await getWorkspace(s.user), requestId);
    if (path[0] === 'profile') {
      const name = username.parse(path[1]);
      if (method === 'GET') {
        await getProfile(userId, name);
        if (!path[2]) return ok(await getProfile(userId, name), requestId);
        if (path[2] === 'history') return ok(await getHistory(userId, name), requestId);
        if (path[2] === 'events') return ok(await getEvents(userId, name), requestId);
        if (path[2] === 'media') return ok(await getMedia(userId, name), requestId);
        if (path[2] === 'analytics') {
          const p = await getProfile(userId, name),
            history = await getHistory(userId, name);
          return ok(
            {
              media: mediaAnalytics(await getMedia(userId, name), p.followers_count),
              growth: growth(history),
              growth_metrics: ['followers_count', 'following_count', 'media_count'].map((metric) =>
                growthSummary(
                  history,
                  metric as 'followers_count' | 'following_count' | 'media_count',
                ),
              ),
            },
            requestId,
          );
        }
        if (path[2] === 'stories')
          throw new UnsupportedCapability(
            'Third-party Story retrieval is not supported by the configured official provider. Own Story analytics is not enabled.',
          );
      }
      if (path[2] === 'refresh' && method === 'POST') {
        await limit(`refresh:${userId}:${name}`, 1, 60);
        return ok(await refreshProfile(userId, name), requestId);
      }
    }
    if (path[0] === 'media' && method === 'GET') {
      const media = (await getMedia(userId)).find((m) => m.id === path[1]);
      if (!media) throw new ProfileNotFound();
      return ok(media, requestId);
    }
    if (path[0] === 'tracked') {
      if (method === 'GET') return ok(await getTracked(userId), requestId);
      if (method === 'POST') {
        const input = z
          .object({
            username,
            interval_minutes: z.number().int().min(60).max(10080).default(360),
            notify: z.boolean().default(true),
            threshold: z.number().int().positive().optional(),
          })
          .parse(await body(req));
        const p = await getProfile(userId, input.username);
        const id = randomUUID();
        await query(
          'INSERT INTO tracked_profiles(id,user_id,profile_id,interval_minutes,notify) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,profile_id) DO UPDATE SET enabled=true,interval_minutes=EXCLUDED.interval_minutes,notify=EXCLUDED.notify',
          [id, userId, p.id, input.interval_minutes, input.notify],
        );
        if (input.threshold)
          await query(
            'INSERT INTO notification_rules(id,user_id,profile_id,event_type,threshold) VALUES($1,$2,$3,$4,$5)',
            [randomUUID(), userId, p.id, 'followers_count', input.threshold],
          );
        return ok(await getTracked(userId), requestId, 201);
      }
      if (method === 'PATCH' && path[1]) {
        const input = z
          .object({
            enabled: z.boolean().optional(),
            interval_minutes: z.number().int().min(60).max(10080).optional(),
            notify: z.boolean().optional(),
          })
          .parse(await body(req));
        const rows = await query(
          'UPDATE tracked_profiles SET enabled=COALESCE($3,enabled),interval_minutes=COALESCE($4,interval_minutes),notify=COALESCE($5,notify) WHERE id=$1 AND user_id=$2 RETURNING id',
          [
            path[1],
            userId,
            input.enabled ?? null,
            input.interval_minutes ?? null,
            input.notify ?? null,
          ],
        );
        if (!rows.length) throw new ProfileNotFound();
        return ok({ updated: true }, requestId);
      }
      if (method === 'DELETE' && path[1]) {
        const rows = await query(
          'DELETE FROM tracked_profiles WHERE id=$1 AND user_id=$2 RETURNING id',
          [path[1], userId],
        );
        if (!rows.length) throw new ProfileNotFound();
        return ok({ deleted: true }, requestId);
      }
    }
    if (path[0] === 'saved') {
      if (method === 'GET') return ok(await getSaved(userId), requestId);
      if (method === 'POST') {
        const input = z
          .object({
            username,
            notes: z.string().max(2000).default(''),
            label: z.string().max(80).default(''),
            tags: z.array(z.enum(TAGS)).max(6).default([]),
          })
          .parse(await body(req));
        const p = await getProfile(userId, input.username);
        await (
          await database()
        ).transaction(async (tx) => {
          const rows = await tx.query<{ id: string }>(
            'INSERT INTO saved_profiles(id,user_id,profile_id,notes,label) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,profile_id) DO UPDATE SET notes=EXCLUDED.notes,label=EXCLUDED.label RETURNING id',
            [randomUUID(), userId, p.id, input.notes, input.label],
          );
          await tx.query('DELETE FROM profile_tags WHERE saved_profile_id=$1', [rows[0].id]);
          for (const tag of new Set(input.tags)) {
            const t = await tx.query<{ id: string }>(
              'INSERT INTO tags(id,user_id,name) VALUES($1,$2,$3) ON CONFLICT(user_id,name) DO UPDATE SET name=EXCLUDED.name RETURNING id',
              [randomUUID(), userId, tag],
            );
            await tx.query('INSERT INTO profile_tags(saved_profile_id,tag_id) VALUES($1,$2)', [
              rows[0].id,
              t[0].id,
            ]);
          }
        });
        return ok(await getSaved(userId), requestId, 201);
      }
      if (method === 'DELETE' && path[1]) {
        await query('DELETE FROM saved_profiles WHERE user_id=$1 AND id=$2', [userId, path[1]]);
        return ok({ deleted: true }, requestId);
      }
    }
    if (path[0] === 'compare' && method === 'GET') {
      const names = z
        .array(username)
        .min(2)
        .max(5)
        .parse((req.nextUrl.searchParams.get('accounts') ?? '').split(','));
      if (new Set(names).size !== names.length)
        throw new AppError('VALIDATION_ERROR', 'Choose distinct accounts.');
      return ok(
        await Promise.all(
          names.map(async (name) => {
            const p = await getProfile(userId, name);
            return {
              profile: p,
              history: await getHistory(userId, name),
              growth: growth(await getHistory(userId, name), 30),
              analytics: mediaAnalytics(await getMedia(userId, name), p.followers_count),
            };
          }),
        ),
        requestId,
      );
    }
    if (path[0] === 'link' && path[1] === 'inspect' && method === 'POST') {
      const input = z.object({ url: z.string().min(1).max(2048) }).parse(await body(req));
      return ok(inspectLink(input.url), requestId);
    }
    if (path[0] === 'notifications') {
      if (method === 'GET') return ok((await getWorkspace(s.user)).notifications, requestId);
      if (method === 'PATCH') {
        await query(
          'UPDATE notifications SET read_at=now() WHERE user_id=$1 AND ($2::text IS NULL OR id=$2)',
          [userId, path[1] ?? null],
        );
        return ok({ updated: true }, requestId);
      }
    }
    if (path[0] === 'me' && path[1] === 'connections') {
      if (method === 'GET') return ok(await getConnections(userId), requestId);
      if (method === 'DELETE' && path[2]) {
        await query('DELETE FROM oauth_connections WHERE id=$1 AND user_id=$2', [path[2], userId]);
        await query(
          "UPDATE tracked_profiles SET enabled=false,last_error='Connection disconnected' WHERE user_id=$1 AND profile_id IN (SELECT id FROM instagram_profiles WHERE user_id=$1 AND provider='meta')",
          [userId],
        );
        return ok(
          {
            disconnected: true,
            note: 'Local token removed. Revoke app access in Instagram settings to invalidate the grant at Meta.',
          },
          requestId,
        );
      }
    }
    if (path[0] === 'me' && path[1] === 'data' && method === 'DELETE') {
      await query('DELETE FROM users WHERE id=$1', [userId]);
      const response = ok({ deleted: true }, requestId);
      response.cookies.delete('rig_session');
      response.cookies.delete('rig_csrf');
      return response;
    }
    throw new AppError('NOT_FOUND', 'This API endpoint does not exist.', 404);
  });
}
export const GET = route;
export const POST = route;
export const PATCH = route;
export const DELETE = route;
