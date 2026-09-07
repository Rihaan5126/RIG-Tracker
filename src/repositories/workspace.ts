import { randomUUID } from 'node:crypto';
import { database, query, type SQL } from '@/server/db';
import type {
  Profile,
  Snapshot,
  Media,
  TrackingEvent,
  TrackedProfile,
  SavedProfile,
  Notification,
  Connection,
  User,
  WorkspaceData,
  NormalizedProfile,
} from '@/domain/models';
import { config, metaConfigured } from '@/server/config';
import { fixtures } from '@/providers/instagram/fixtures';
import { ProfileNotFound } from '@/providers/instagram/exceptions';
import { hash } from '@/server/crypto';
import { PROFILE_FIELDS } from '@/domain/models';
export function fingerprint(profile: NormalizedProfile) {
  return hash(JSON.stringify(PROFILE_FIELDS.map((k) => profile[k])));
}
export const profileColumns = [
  'provider',
  'instagram_id',
  'username',
  'display_name',
  'biography',
  'profile_picture_url',
  'website',
  'followers_count',
  'following_count',
  'media_count',
  'account_type',
  'verified',
  'source',
  'field_sources',
  'retrieved_at',
] as const;
export function profileRecord(p: NormalizedProfile) {
  return Object.fromEntries(profileColumns.map((k) => [k, p[k]]));
}
type Table =
  | 'instagram_profiles'
  | 'profile_snapshots'
  | 'tracking_events'
  | 'media'
  | 'media_metrics'
  | 'notifications';
export async function insertRows(tx: SQL, table: Table, rows: Record<string, unknown>[]) {
  for (let start = 0; start < rows.length; start += 200) {
    const chunk = rows.slice(start, start + 200),
      keys = Object.keys(chunk[0]);
    if (keys.some((k) => !/^[a-z_]+$/.test(k))) throw new Error('Invalid internal column');
    const values = chunk.flatMap((row) =>
      keys.map((k) =>
        typeof row[k] === 'object' && row[k] !== null && !(row[k] instanceof Date)
          ? JSON.stringify(row[k])
          : row[k],
      ),
    );
    const placeholders = chunk
      .map((_, i) => `(${keys.map((_, j) => `$${i * keys.length + j + 1}`).join(',')})`)
      .join(',');
    await tx.query(`INSERT INTO ${table} (${keys.join(',')}) VALUES ${placeholders}`, values);
  }
}
export async function seedWorkspace(user: User) {
  const data = fixtures(),
    ids = new Map(data.profiles.map((p) => [p.id, `${user.id}:${p.id}`]));
  await (
    await database()
  ).transaction(async (tx) => {
    await insertRows(
      tx,
      'instagram_profiles',
      data.profiles.map((p) => ({
        id: ids.get(p.id),
        user_id: user.id,
        ...profileRecord(p),
        color: p.color,
      })),
    );
    const trackedIds = new Map<string, string>();
    for (const p of data.profiles.slice(0, 4)) {
      const id = randomUUID();
      trackedIds.set(p.id, id);
      await tx.query(
        'INSERT INTO tracked_profiles(id,user_id,profile_id,interval_minutes,next_run_at,last_checked_at) VALUES($1,$2,$3,360,$4,$5)',
        [id, user.id, ids.get(p.id), new Date(Date.now() + 360 * 60000), new Date()],
      );
    }
    await insertRows(
      tx,
      'profile_snapshots',
      data.snapshots.map((s) => ({
        id: `${user.id}:${s.id}`,
        profile_id: ids.get(s.profile_id),
        tracked_profile_id: trackedIds.get(s.profile_id) ?? null,
        ...profileRecord(s),
        fingerprint: fingerprint(s),
        raw_provider_metadata: { fictional: true },
      })),
    );
    await insertRows(
      tx,
      'tracking_events',
      data.events.map((e) => ({
        ...e,
        id: `${user.id}:${e.id}`,
        profile_id: ids.get(e.profile_id),
        snapshot_id: `${user.id}:${e.snapshot_id}`,
        old_value: e.old_value === null ? null : JSON.stringify(e.old_value),
        new_value: e.new_value === null ? null : JSON.stringify(e.new_value),
      })),
    );
    for (const p of data.profiles) {
      await storeMedia(
        tx,
        ids.get(p.id)!,
        data.media.filter((m) => m.profile_id === p.id),
      );
    }
    for (const [index, p] of data.profiles.slice(0, 3).entries()) {
      const id = randomUUID();
      await tx.query(
        'INSERT INTO saved_profiles(id,user_id,profile_id,notes,label) VALUES($1,$2,$3,$4,$5)',
        [
          id,
          user.id,
          ids.get(p.id),
          'Fictional sample account for your research workspace.',
          p.display_name,
        ],
      );
      const tag = randomUUID();
      await tx.query('INSERT INTO tags(id,user_id,name) VALUES($1,$2,$3)', [
        tag,
        user.id,
        ['Brand', 'Competitor', 'Research'][index],
      ]);
      await tx.query('INSERT INTO profile_tags(saved_profile_id,tag_id) VALUES($1,$2)', [id, tag]);
    }
    const important = data.events
      .filter((e) =>
        ['growth_spike', 'biography', 'website', 'username', 'profile_picture_url'].includes(
          e.event_type,
        ),
      )
      .sort((a, b) => b.detected_at.localeCompare(a.detected_at))
      .slice(0, 12);
    await insertRows(
      tx,
      'notifications',
      important.map((e) => ({
        id: randomUUID(),
        user_id: user.id,
        event_id: `${user.id}:${e.id}`,
        title:
          e.event_type === 'growth_spike'
            ? 'Unusual follower growth detected'
            : `${e.event_type.replaceAll('_', ' ')} changed`,
        body: `Fictional observation for @${e.username}. Open the profile history to review the change.`,
        username: e.username,
        event_type: e.event_type,
        created_at: e.detected_at,
      })),
    );
  });
}
export async function storeMedia(tx: SQL, profileId: string, items: Media[]) {
  for (const m of items) {
    const id = `${profileId}:${m.id}`;
    await tx.query(
      'INSERT INTO media(id,profile_id,provider_media_id,username,type,caption,permalink,thumbnail_url,media_url,timestamp,source,field_sources) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(profile_id,provider_media_id) DO UPDATE SET caption=EXCLUDED.caption,thumbnail_url=EXCLUDED.thumbnail_url,media_url=EXCLUDED.media_url,field_sources=EXCLUDED.field_sources',
      [
        id,
        profileId,
        m.id,
        m.username,
        m.type,
        m.caption,
        m.permalink,
        m.thumbnail_url,
        m.media_url,
        m.timestamp,
        m.source,
        JSON.stringify(m.field_sources),
      ],
    );
    await tx.query(
      'INSERT INTO media_metrics(id,media_id,likes,comments,views,reach,saved,shares,impressions,duration,retrieved_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())',
      [
        randomUUID(),
        id,
        m.likes,
        m.comments,
        m.views,
        m.reach,
        m.saved,
        m.shares,
        m.impressions,
        m.duration,
      ],
    );
  }
}
export async function getProfiles(userId: string) {
  return query<Profile>(
    'SELECT p.* FROM instagram_profiles p WHERE user_id=$1 ORDER BY followers_count DESC NULLS LAST',
    [userId],
  );
}
export async function getProfile(userId: string, username: string) {
  const rows = await query<Profile>(
    'SELECT * FROM instagram_profiles WHERE user_id=$1 AND (username=$2 OR id=$2 OR instagram_id=$2) LIMIT 1',
    [userId, username],
  );
  if (!rows[0]) throw new ProfileNotFound();
  return rows[0];
}
export async function getHistory(userId: string, username?: string) {
  return query<Snapshot>(
    'SELECT s.* FROM profile_snapshots s JOIN instagram_profiles p ON s.profile_id=p.id WHERE p.user_id=$1 AND ($2::text IS NULL OR p.username=$2 OR p.id=$2) ORDER BY s.retrieved_at',
    [userId, username ?? null],
  );
}
export async function getEvents(userId: string, username?: string) {
  return query<TrackingEvent>(
    'SELECT e.* FROM tracking_events e JOIN instagram_profiles p ON e.profile_id=p.id WHERE p.user_id=$1 AND ($2::text IS NULL OR p.username=$2 OR p.id=$2) ORDER BY e.detected_at DESC LIMIT 10000',
    [userId, username ?? null],
  );
}
export async function getMedia(userId: string, username?: string) {
  return query<Media>(
    `SELECT m.*, mm.likes,mm.comments,mm.views,mm.reach,mm.saved,mm.shares,mm.impressions,mm.duration FROM media m JOIN instagram_profiles p ON p.id=m.profile_id LEFT JOIN LATERAL (SELECT * FROM media_metrics WHERE media_id=m.id ORDER BY retrieved_at DESC LIMIT 1) mm ON true WHERE p.user_id=$1 AND ($2::text IS NULL OR p.username=$2 OR p.id=$2) ORDER BY m.timestamp DESC LIMIT 1000`,
    [userId, username ?? null],
  );
}
export async function getTracked(userId: string) {
  const rows = await query<Omit<TrackedProfile, 'profile'>>(
    'SELECT * FROM tracked_profiles WHERE user_id=$1 ORDER BY next_run_at',
    [userId],
  );
  const profiles = await getProfiles(userId);
  return rows.map((r) => ({ ...r, profile: profiles.find((p) => p.id === r.profile_id)! }));
}
export async function getSaved(userId: string) {
  const rows = await query<{
    id: string;
    profile_id: string;
    notes: string;
    label: string;
    created_at: string;
    tags: string[];
  }>(
    `SELECT s.*,COALESCE((SELECT array_agg(t.name ORDER BY t.name) FROM profile_tags pt JOIN tags t ON t.id=pt.tag_id WHERE pt.saved_profile_id=s.id),ARRAY[]::text[]) as tags FROM saved_profiles s WHERE user_id=$1 ORDER BY created_at DESC`,
    [userId],
  );
  const profiles = await getProfiles(userId);
  return rows.map((r) => ({
    ...r,
    profile: profiles.find((p) => p.id === r.profile_id)!,
  })) as SavedProfile[];
}
export async function getConnections(userId: string) {
  return query<Connection>(
    'SELECT id,provider_account_id,username,scopes,expires_at FROM oauth_connections WHERE user_id=$1',
    [userId],
  );
}
export async function getWorkspace(user: User): Promise<WorkspaceData> {
  const [profiles, snapshots, events, media, tracked, saved, notifications, connections, status] =
    await Promise.all([
      getProfiles(user.id),
      getHistory(user.id),
      getEvents(user.id),
      getMedia(user.id),
      getTracked(user.id),
      getSaved(user.id),
      query<Notification>(
        'SELECT id,title,body,username,event_type,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200',
        [user.id],
      ),
      getConnections(user.id),
      query<{ value: string }>("SELECT value FROM system_status WHERE key='worker_last_seen'"),
    ]);
  return {
    user,
    profiles,
    snapshots,
    events,
    media,
    tracked,
    saved,
    notifications,
    connections,
    provider: config.INSTAGRAM_PROVIDER,
    meta_configured: metaConfigured(),
    storage: config.DATABASE_URL ? 'PostgreSQL' : 'Embedded PostgreSQL · local development',
    worker_last_seen: status[0]?.value ?? null,
  };
}
