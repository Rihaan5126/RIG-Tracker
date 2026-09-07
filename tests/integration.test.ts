import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { database, query } from '@/server/db';
import { createUser, createSession, session, csrf } from '@/server/auth';
import {
  hash,
  randomToken,
  encrypt,
  decrypt,
  passwordHash,
  passwordMatches,
} from '@/server/crypto';
import { consumeState } from '@/services/oauth';
import { seedWorkspace, getWorkspace, getProfile, getHistory } from '@/repositories/workspace';
import { refreshProfile } from '@/services/tracking';
import { limit } from '@/server/cache';
import { tick } from '@/services/scheduler';
import { GET, POST, DELETE } from '@/app/api/v1/[...path]/route';
import type { User } from '@/domain/models';
let first: User, second: User, token: string, csrfToken: string;
function req(path: string, method = 'GET', body?: unknown, csrfValue = csrfToken) {
  return new NextRequest(`http://127.0.0.1:3000/api/v1/${path}`, {
    method,
    headers: {
      cookie: `rig_session=${token}`,
      origin: 'http://127.0.0.1:3000',
      'x-csrf-token': csrfValue,
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
beforeAll(async () => {
  await database();
  first = await createUser('First', 'first@example.test', null);
  second = await createUser('Second', 'second@example.test', null);
  await seedWorkspace(first);
  await seedWorkspace(second);
  ({ token, csrfToken } = await createSession(first));
});
afterAll(async () => {
  await (await database()).close();
  globalThis.rigDb = undefined;
});
describe('persistent mock integration', () => {
  it('applies migrations and persists complete demo fixtures', async () => {
    const w = await getWorkspace(first);
    expect(w.profiles).toHaveLength(5);
    expect(w.snapshots).toHaveLength(1830);
    expect(w.media).toHaveLength(240);
    expect(w.tracked).toHaveLength(4);
    expect(w.connections).toEqual([]);
  });
  it('isolates all resource IDs by workspace', async () => {
    const other = await getProfile(second.id, 'rigtracker_demo');
    await expect(getProfile(first.id, other.id)).rejects.toThrow();
    const response = await DELETE(
      req(`tracked/${(await getWorkspace(second)).tracked[0].id}`, 'DELETE'),
    );
    expect(response.status).toBe(404);
    expect((await getWorkspace(second)).tracked).toHaveLength(4);
  });
  it('does not serialize authentication secrets in workspace data', async () => {
    const res = await GET(req('workspace')),
      text = await res.text();
    expect(res.status).toBe(200);
    expect(text).not.toMatch(/encrypted_token|password_hash|rig_session|access_token/);
  });
  it('deduplicates unchanged refreshes', async () => {
    const before = await getHistory(first.id, 'rigtracker_demo');
    await refreshProfile(first.id, 'rigtracker_demo');
    await refreshProfile(first.id, 'rigtracker_demo');
    expect((await getHistory(first.id, 'rigtracker_demo')).length).toBe(before.length);
  });
  it('creates tracker, bookmark, and persists tags through the API', async () => {
    expect(
      (await POST(req('tracked', 'POST', { username: 'offgrid_demo', interval_minutes: 360 })))
        .status,
    ).toBe(201);
    const res = await POST(
      req('saved', 'POST', {
        username: 'offgrid_demo',
        tags: ['Research', 'Creator'],
        notes: 'Integration note',
      }),
    );
    expect(res.status).toBe(201);
    expect(
      (await getWorkspace(first)).saved.find((s) => s.profile.username === 'offgrid_demo'),
    ).toMatchObject({ notes: 'Integration note', tags: ['Creator', 'Research'] });
  });
  it('rejects unknown mock accounts instead of inventing a profile', async () => {
    const res = await GET(req('profile/some_real_account'));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('PROFILE_NOT_AVAILABLE');
  });
  it('returns explicit unsupported capability errors', async () => {
    const res = await GET(req('profile/rigtracker_demo/stories'));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('UNSUPPORTED_CAPABILITY');
  });
  it('enforces compare limits and request validation', async () => {
    expect((await GET(req('compare?accounts=rigtracker_demo'))).status).toBe(400);
    expect(
      (await POST(req('tracked', 'POST', { username: 'rigtracker_demo', interval_minutes: 1 })))
        .status,
    ).toBe(400);
  });
  it('claims due work, records a heartbeat and releases leases', async () => {
    const result = await tick();
    expect(result.processed).toBeGreaterThanOrEqual(1);
    expect((await getWorkspace(first)).worker_last_seen).not.toBeNull();
    expect(
      await query('SELECT id FROM tracked_profiles WHERE user_id=$1 AND lease_until IS NOT NULL', [
        first.id,
      ]),
    ).toEqual([]);
    expect((await tick()).processed).toBe(0);
  });
});
describe('security controls', () => {
  it('requires a session and CSRF token on mutations', async () => {
    const unauth = await GET(new NextRequest('http://127.0.0.1:3000/api/v1/tracked'));
    expect(unauth.status).toBe(401);
    const denied = await POST(req('tracked', 'POST', { username: 'rigtracker_demo' }, 'wrong'));
    expect(denied.status).toBe(403);
  });
  it('rejects cross-origin requests even with a valid CSRF token', async () => {
    const s = await session(req('workspace'));
    const cross = new NextRequest('http://127.0.0.1:3000/api/v1/tracked', {
      method: 'POST',
      headers: { origin: 'https://evil.test', 'x-csrf-token': s.csrf },
    });
    expect(() => csrf(cross, s)).toThrow();
  });
  it('consumes state once and binds it to the initiating session', async () => {
    const s = await session(req('workspace'));
    const state = randomToken();
    await query('INSERT INTO oauth_states(id,user_id,session_id,expires_at) VALUES($1,$2,$3,$4)', [
      hash(state),
      first.id,
      s.id,
      new Date(Date.now() + 600000),
    ]);
    expect(await consumeState(state, { ...s, id: randomUUID() })).toBe(false);
    expect(await consumeState(state, s)).toBe(true);
    expect(await consumeState(state, s)).toBe(false);
  });
  it('rejects expired state', async () => {
    const s = await session(req('workspace'));
    const state = randomToken();
    await query('INSERT INTO oauth_states(id,user_id,session_id,expires_at) VALUES($1,$2,$3,$4)', [
      hash(state),
      first.id,
      s.id,
      new Date(Date.now() - 1000),
    ]);
    expect(await consumeState(state, s)).toBe(false);
  });
  it('authenticates encrypted tokens and hashes passwords', () => {
    const encrypted = encrypt('fixture-not-a-real-token');
    expect(encrypted).not.toContain('fixture');
    expect(decrypt(encrypted)).toBe('fixture-not-a-real-token');
    expect(() => decrypt(encrypted.slice(0, -5) + 'abcde')).toThrow();
    const p = passwordHash('a-long-test-password');
    expect(passwordMatches('a-long-test-password', p)).toBe(true);
    expect(passwordMatches('different-password', p)).toBe(false);
  });
  it('enforces rate limit atomically in local mode', async () => {
    const key = randomUUID();
    await limit(key, 1, 60);
    await expect(limit(key, 1, 60)).rejects.toHaveProperty('code', 'RATE_LIMITED');
  });
  it('deletes local data with cascades and ends the session', async () => {
    const res = await DELETE(req('me/data', 'DELETE'));
    expect(res.status).toBe(200);
    expect(await query('SELECT id FROM instagram_profiles WHERE user_id=$1', [first.id])).toEqual(
      [],
    );
    expect(await query('SELECT id FROM sessions WHERE user_id=$1', [first.id])).toEqual([]);
    expect((await getWorkspace(second)).profiles).toHaveLength(5);
  });
});
