import { describe, it, expect } from 'vitest';
import { fixtures } from '@/providers/instagram/fixtures';
import { normalizeProfile, normalizeMedia, safeUrl } from '@/providers/instagram/normalization';
import {
  diffProfiles,
  growth,
  spike,
  ratio,
  engagement,
  mediaAnalytics,
  DAY,
} from '@/domain/analytics';
import { inspectLink } from '@/services/links';
import { shouldNotify, discordPayload } from '@/services/notifications';
import { normalizeMetaError } from '@/providers/instagram/meta-api';
import { retryDelay } from '@/services/scheduler';
const data = fixtures(new Date('2026-09-07T10:00:00Z'));
describe('provider normalization', () => {
  it('does not fabricate unavailable fields or verification', () => {
    const p = normalizeProfile({
      id: '42',
      username: 'studio',
      followers_count: 0,
      verified: true,
    });
    expect(p.followers_count).toBe(0);
    expect(p.biography).toBeNull();
    expect(p.following_count).toBeNull();
    expect(p.verified).toBeNull();
    expect(p.field_sources.biography).toBe('unavailable');
  });
  it('removes unsafe provider URLs and invalid numbers', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('https://name:pass@example.com')).toBeNull();
    expect(
      normalizeProfile({ id: 'a', username: 'b', followers_count: -2 }).followers_count,
    ).toBeNull();
  });
  it('normalizes reels separately and keeps zero counts', () => {
    const m = normalizeMedia(
      {
        id: 'a',
        media_type: 'VIDEO',
        media_product_type: 'REELS',
        timestamp: '2026-09-01T12:00:00Z',
        like_count: 0,
      },
      'p',
      'u',
    );
    expect(m.type).toBe('REEL');
    expect(m.likes).toBe(0);
    expect(m.views).toBeNull();
  });
  it('creates at least twelve months and forty media items with no real claims', () => {
    expect(data.snapshots.filter((s) => s.profile_id === 'demo-1')).toHaveLength(366);
    expect(data.media.filter((m) => m.profile_id === 'demo-1')).toHaveLength(48);
    expect(data.profiles.every((p) => p.source === 'mock' && p.username.endsWith('_demo'))).toBe(
      true,
    );
    expect(data.events.some((e) => e.event_type === 'username')).toBe(true);
    expect(data.events.filter((e) => e.event_type === 'growth_spike').length).toBeGreaterThan(3);
  });
});
describe('history and derived metrics', () => {
  it('diffs null, zero, and renamed usernames accurately', () => {
    const p = data.profiles[0];
    expect(
      diffProfiles({ ...p, username: 'old', followers_count: null }, { ...p, followers_count: 0 }),
    ).toEqual(
      expect.arrayContaining([
        { event_type: 'username', old_value: 'old', new_value: p.username },
        { event_type: 'followers_count', old_value: null, new_value: 0 },
      ]),
    );
  });
  it('uses actual observations and elapsed time', () => {
    const a = [
      { retrieved_at: '2026-09-01T00:00:00Z', followers_count: 100 },
      { retrieved_at: '2026-09-08T00:00:00Z', followers_count: 121 },
    ];
    expect(growth(a, 7)).toMatchObject({ absolute: 21, percentage: 21, daily: 3, weekly: 21 });
    expect(growth(a, 1)).toBeNull();
  });
  it('never bridges missing operands or divides by zero', () => {
    expect(ratio(1, 0)).toBeNull();
    expect(ratio(null, 3)).toBeNull();
    expect(
      growth(
        [
          { retrieved_at: '2026-09-01', followers_count: null },
          { retrieved_at: '2026-09-02', followers_count: 40 },
        ],
        1,
      ),
    ).toBeNull();
    expect(engagement({ ...data.media[0], likes: null }, 100)).toBeNull();
  });
  it('does not fill missing day boundaries', () => {
    const s = data.snapshots.filter((s) => s.profile_id === 'demo-1').slice(-30);
    const sparse = [s[0], s.at(-1)!];
    expect(growth(sparse, 7)).toBeNull();
    expect(Date.parse(s[1].retrieved_at) - Date.parse(s[0].retrieved_at)).toBe(DAY);
  });
  it('requires sufficient baseline for statistical spikes', () => {
    expect(spike([1, 2, 80]).detected).toBe(false);
    expect(spike([9, 10, 11, 10, 9, 11, 10, 100]).detected).toBe(true);
    expect(spike([10, 10, 10, 10, 10, 10, 10, 10]).detected).toBe(false);
  });
  it('computes median and leaves unavailable averages null', () => {
    const m = data.media[0],
      items = [
        { ...m, likes: 10, comments: 0 },
        { ...m, likes: 30, comments: 0 },
      ];
    expect(mediaAnalytics(items, 100).median_engagement).toBe(20);
    expect(mediaAnalytics([{ ...m, views: null }], 100).average_views).toBeNull();
    expect(mediaAnalytics([], 100).best).toBeNull();
  });
});
describe('URL safety', () => {
  it('cleans recognized tracking values without fetching or destroying unknown query semantics', () => {
    const r = inspectLink(
      'http://m.instagram.com/reel/ABC_123/?igsh=hidden&utm_source=test&useful=keep#anchor',
    );
    expect(r.canonical_url).toBe('https://www.instagram.com/reel/ABC_123/?useful=keep');
    expect(r.identifier).toBe('ABC_123');
    expect(r.redirects_followed).toBe(false);
    expect(r.redirect_chain).toEqual([]);
  });
  it.each([
    'http://127.0.0.1/admin',
    'https://instagram.com.evil.test/p/abc',
    'https://instagram.com@evil.test/a',
    'https://evil@instagram.com/a',
    'file:///etc/passwd',
    'https://instagram.com:8000/a',
    'https://instagram.com/p/%0afoo',
  ])('rejects SSRF and malformed URL %s', (url) => expect(() => inspectLink(url)).toThrow());
  it('extracts Story IDs without retrieving stories', () => {
    expect(inspectLink('instagram.com/stories/demo/12345/?igshid=x')).toMatchObject({
      type: 'story',
      identifier: '12345',
    });
  });
});
describe('notifications and failures', () => {
  it('triggers only on a true threshold crossing', () => {
    expect(
      shouldNotify({ event_type: 'followers_count', old_value: 90, new_value: 105 }, 100),
    ).toBe(true);
    expect(
      shouldNotify({ event_type: 'followers_count', old_value: 105, new_value: 110 }, 100),
    ).toBe(false);
    expect(
      shouldNotify({ event_type: 'followers_count', old_value: null, new_value: 110 }, 100),
    ).toBe(false);
  });
  it('normalizes authorization, quota, and unsupported errors', () => {
    expect(normalizeMetaError(400, 190)).toHaveProperty('code', 'TOKEN_EXPIRED');
    expect(normalizeMetaError(429, 4, '240')).toHaveProperty('retryAfter', 240);
    expect(normalizeMetaError(400, 100)).toHaveProperty('code', 'UNSUPPORTED_CAPABILITY');
    expect(normalizeMetaError(500)).toHaveProperty('code', 'PROVIDER_UNAVAILABLE');
  });
  it('bounds retry timing and respects Retry-After', () => {
    expect(retryDelay(3)).toBe(480);
    expect(retryDelay(3, 1200)).toBe(1200);
    expect(retryDelay(50)).toBeLessThanOrEqual(86400);
  });
  it('builds bounded Discord payloads without enabling mentions', () => {
    const p = discordPayload({
      event: 'Biography changed',
      username: 'demo',
      oldValue: '@everyone',
      newValue: 'new',
      timestamp: '2026-09-01T00:00:00Z',
      profileUrl: 'https://example.com/profile/demo',
    });
    expect(p.username).toBe('RIGtracker');
    expect(p.allowed_mentions.parse).toEqual([]);
  });
});
