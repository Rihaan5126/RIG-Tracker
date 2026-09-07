import { randomUUID } from 'node:crypto';
import type { NormalizedProfile, Profile, Snapshot, TrackingEvent } from '@/domain/models';
import { database, query, type SQL } from '@/server/db';
import { config } from '@/server/config';
import { decrypt } from '@/server/crypto';
import { MockProvider } from '@/providers/instagram/mock';
import { MetaProvider } from '@/providers/instagram/meta-api';
import type { ProviderContext } from '@/providers/instagram/base';
import {
  AppError,
  PermissionMissing,
  UnsupportedCapability,
} from '@/providers/instagram/exceptions';
import {
  fingerprint,
  profileRecord,
  insertRows,
  getProfile,
  storeMedia,
} from '@/repositories/workspace';
import { diffProfiles, dailyChanges, spike } from '@/domain/analytics';
import { notifyEvent } from './notifications';
export async function providerFor(userId: string, instagramId?: string) {
  if (config.INSTAGRAM_PROVIDER === 'mock')
    return { provider: new MockProvider(), context: { userId } as ProviderContext };
  const c = (
    await query<{
      provider_account_id: string;
      username: string;
      encrypted_token: string;
      scopes: string[];
      expires_at: string;
    }>(
      'SELECT provider_account_id,username,encrypted_token,scopes,expires_at FROM oauth_connections WHERE user_id=$1 AND ($2::text IS NULL OR provider_account_id=$2) ORDER BY created_at DESC LIMIT 1',
      [userId, instagramId ?? null],
    )
  )[0];
  if (!c) throw new PermissionMissing();
  return {
    provider: new MetaProvider(),
    context: {
      userId,
      accountId: c.provider_account_id,
      username: c.username,
      accessToken: decrypt(c.encrypted_token),
      scopes: c.scopes,
      expiresAt: new Date(c.expires_at).toISOString(),
    },
  };
}
export async function persistProfile(userId: string, p: NormalizedProfile) {
  return (await database()).transaction(async (tx) => {
    const existing = (
      await tx.query<Profile>(
        'SELECT * FROM instagram_profiles WHERE user_id=$1 AND provider=$2 AND instagram_id=$3 FOR UPDATE',
        [userId, p.provider, p.instagram_id],
      )
    )[0];
    const id = existing?.id ?? randomUUID(),
      record = profileRecord(p);
    if (!existing)
      await insertRows(tx, 'instagram_profiles', [
        { id, user_id: userId, ...record, color: '#a4f2ce' },
      ]);
    else {
      const keys = Object.keys(record);
      await tx.query(
        `UPDATE instagram_profiles SET ${keys.map((k, i) => `${k}=$${i + 2}`).join(',')} WHERE id=$1`,
        [id, ...keys.map((k) => (k === 'field_sources' ? JSON.stringify(record[k]) : record[k]))],
      );
    }
    if (p.provider === 'meta')
      await tx.query(
        'UPDATE oauth_connections SET username=$1 WHERE user_id=$2 AND provider_account_id=$3',
        [p.username, userId, p.instagram_id],
      );
    const last = (
      await tx.query<Snapshot & { fingerprint: string }>(
        'SELECT * FROM profile_snapshots WHERE profile_id=$1 ORDER BY retrieved_at DESC LIMIT 1',
        [id],
      )
    )[0];
    const fp = fingerprint(p);
    if (
      last &&
      last.fingerprint === fp &&
      Date.parse(p.retrieved_at) - new Date(last.retrieved_at).getTime() < 86400000
    )
      return { id, changed: false };
    const track = (
      await tx.query<{ id: string; notify: boolean }>(
        'SELECT id,notify FROM tracked_profiles WHERE user_id=$1 AND profile_id=$2',
        [userId, id],
      )
    )[0];
    const snapshotId = randomUUID();
    await insertRows(tx, 'profile_snapshots', [
      {
        id: snapshotId,
        profile_id: id,
        tracked_profile_id: track?.id ?? null,
        ...record,
        fingerprint: fp,
        raw_provider_metadata: {},
      },
    ]);
    if (last) {
      const events: TrackingEvent[] = diffProfiles(last, p).map((d) => ({
        id: randomUUID(),
        profile_id: id,
        snapshot_id: snapshotId,
        ...d,
        detected_at: p.retrieved_at,
        username: p.username,
        source: p.source,
      }));
      const history = await tx.query<Snapshot>(
        'SELECT * FROM profile_snapshots WHERE profile_id=$1 ORDER BY retrieved_at DESC LIMIT 32',
        [id],
      );
      if (spike(dailyChanges(history)).detected)
        events.push({
          id: randomUUID(),
          profile_id: id,
          snapshot_id: snapshotId,
          event_type: 'growth_spike',
          old_value: last.followers_count,
          new_value: p.followers_count,
          detected_at: p.retrieved_at,
          username: p.username,
          source: p.source,
        });
      for (const e of events) await storeEvent(tx, userId, e, track?.notify ?? false);
    }
    return { id, changed: !!last };
  });
}
async function storeEvent(tx: SQL, userId: string, e: TrackingEvent, notify: boolean) {
  await insertRows(tx, 'tracking_events', [
    {
      ...e,
      old_value: e.old_value === null ? null : JSON.stringify(e.old_value),
      new_value: e.new_value === null ? null : JSON.stringify(e.new_value),
    },
  ]);
  if (notify) await notifyEvent(tx, userId, e);
}
export async function refreshProfile(userId: string, username: string) {
  const current = await getProfile(userId, username),
    { provider, context } = await providerFor(userId, current.instagram_id);
  const p = await provider.getProfile(
    provider.name === 'mock' ? current.instagram_id : current.username,
    context,
  );
  if (p.instagram_id !== current.instagram_id)
    throw new AppError('IDENTITY_MISMATCH', 'Provider identity changed. Refresh was stopped.', 409);
  const result = await persistProfile(userId, p);
  try {
    const media = await provider.getProfileMedia(current.instagram_id, context);
    await (
      await database()
    ).transaction(async (tx) => {
      const prior = await tx.query<{ provider_media_id: string }>(
        'SELECT provider_media_id FROM media WHERE profile_id=$1',
        [current.id],
      );
      const known = new Set(prior.map((m) => m.provider_media_id));
      const track = (
        await tx.query<{ notify: boolean }>(
          'SELECT notify FROM tracked_profiles WHERE user_id=$1 AND profile_id=$2',
          [userId, current.id],
        )
      )[0];
      await storeMedia(tx, current.id, media);
      if (prior.length)
        for (const m of media.filter((m) => !known.has(m.id)))
          await storeEvent(
            tx,
            userId,
            {
              id: randomUUID(),
              profile_id: current.id,
              snapshot_id: null,
              event_type: 'new_media',
              old_value: null,
              new_value: m.id,
              detected_at: new Date().toISOString(),
              username: p.username,
              source: p.source,
            },
            track?.notify ?? false,
          );
    });
  } catch (e) {
    if (!(e instanceof UnsupportedCapability)) throw e;
  }
  await query(
    'UPDATE tracked_profiles SET last_checked_at=now(),failures=0,last_error=NULL WHERE user_id=$1 AND profile_id=$2',
    [userId, current.id],
  );
  return { ...result, profile: await getProfile(userId, current.id) };
}
