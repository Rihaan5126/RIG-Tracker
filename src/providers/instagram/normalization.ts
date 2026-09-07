import { PROFILE_FIELDS, type NormalizedProfile, type Media, type Source } from '@/domain/models';
const numeric = (x: unknown): number | null =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null;
const string = (x: unknown): string | null => (typeof x === 'string' ? x : null);
export function safeUrl(x: unknown) {
  try {
    const u = new URL(String(x));
    return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}
export function normalizeProfile(
  raw: Record<string, unknown>,
  source: Source = 'authorized',
): NormalizedProfile {
  if (typeof raw.id !== 'string' || typeof raw.username !== 'string')
    throw new Error('Invalid provider identity');
  const profile: NormalizedProfile = {
    provider: source === 'mock' ? 'mock' : 'meta',
    instagram_id: raw.id,
    username: raw.username,
    display_name: string(raw.name),
    biography: string(raw.biography),
    profile_picture_url: safeUrl(raw.profile_picture_url),
    website: safeUrl(raw.website),
    followers_count: numeric(raw.followers_count),
    following_count: numeric(raw.follows_count),
    media_count: numeric(raw.media_count),
    account_type: string(raw.account_type),
    verified: null,
    source,
    field_sources: {},
    retrieved_at: new Date().toISOString(),
  };
  profile.field_sources = Object.fromEntries(
    PROFILE_FIELDS.map((k) => [k, profile[k] === null ? 'unavailable' : source]),
  );
  return profile;
}
export function normalizeMedia(
  raw: Record<string, unknown>,
  profileId: string,
  username: string,
): Media {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.timestamp !== 'string' ||
    !Number.isFinite(Date.parse(raw.timestamp))
  )
    throw new Error('Invalid media identity');
  const type =
    raw.media_product_type === 'REELS'
      ? 'REEL'
      : ((['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'].includes(String(raw.media_type))
          ? raw.media_type
          : 'IMAGE') as Media['type']);
  const m: Media = {
    id: raw.id,
    profile_id: profileId,
    username,
    type,
    caption: string(raw.caption),
    permalink: safeUrl(raw.permalink),
    thumbnail_url: safeUrl(raw.thumbnail_url) || safeUrl(raw.media_url),
    media_url: safeUrl(raw.media_url),
    timestamp: new Date(raw.timestamp).toISOString(),
    likes: numeric(raw.like_count),
    comments: numeric(raw.comments_count),
    views: null,
    reach: null,
    saved: null,
    shares: null,
    impressions: null,
    duration: null,
    source: 'authorized',
    field_sources: {},
  };
  m.field_sources = Object.fromEntries(
    Object.entries(m)
      .filter(([k]) => k !== 'field_sources')
      .map(([k, v]) => [k, v === null ? 'unavailable' : 'authorized']),
  );
  return m;
}
