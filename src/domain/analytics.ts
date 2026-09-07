import { PROFILE_FIELDS, type Media, type Snapshot, type NormalizedProfile } from './models';
export const DAY = 86_400_000;
export function diffProfiles(previous: NormalizedProfile, current: NormalizedProfile) {
  return PROFILE_FIELDS.filter((key) => previous[key] !== current[key]).map((key) => ({
    event_type: key,
    old_value: previous[key],
    new_value: current[key],
  }));
}
export function ratio(numerator: number | null, denominator: number | null): number | null {
  return numerator === null || denominator === null || denominator <= 0
    ? null
    : (numerator / denominator) * 100;
}
export function engagement(media: Media, followers: number | null) {
  return ratio(
    media.likes === null || media.comments === null ? null : media.likes + media.comments,
    followers,
  );
}
export function growth(
  snapshots: Pick<Snapshot, 'retrieved_at' | 'followers_count'>[],
  days?: number,
) {
  const values = [...snapshots].sort(
    (a, b) => Date.parse(a.retrieved_at) - Date.parse(b.retrieved_at),
  );
  const last = values.at(-1);
  const target = last ? Date.parse(last.retrieved_at) - (days ?? 0) * DAY : 0;
  // Use a real observation at/before the boundary, at most 36h away; never interpolate.
  const first = days
    ? values
        .filter(
          (s) =>
            Date.parse(s.retrieved_at) <= target &&
            target - Date.parse(s.retrieved_at) <= 1.5 * DAY,
        )
        .at(-1)
    : values[0];
  if (
    !first ||
    !last ||
    first === last ||
    first.followers_count === null ||
    last.followers_count === null
  )
    return null;
  const elapsed = (Date.parse(last.retrieved_at) - Date.parse(first.retrieved_at)) / DAY;
  if (elapsed <= 0) return null;
  const absolute = last.followers_count - first.followers_count;
  return {
    absolute,
    percentage: ratio(absolute, first.followers_count),
    daily: absolute / elapsed,
    weekly: (absolute / elapsed) * 7,
    days: elapsed,
    from: first.retrieved_at,
    to: last.retrieved_at,
    source: 'derived' as const,
  };
}
export function spike(changes: number[]) {
  if (changes.length < 8) return { detected: false, mean: null, threshold: null };
  const previous = changes.slice(-31, -1),
    current = changes.at(-1)!;
  const mean = previous.reduce((a, b) => a + b, 0) / previous.length;
  const std = Math.sqrt(previous.reduce((s, x) => s + (x - mean) ** 2, 0) / previous.length);
  return { detected: current > mean + 2 * std && current > 0, mean, threshold: mean + 2 * std };
}
const average = (xs: (number | null)[]) => {
  const valid = xs.filter((x): x is number => x !== null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
};
export function mediaAnalytics(media: Media[], followers: number | null) {
  const rates = media
    .map((m) => ({ media: m, rate: engagement(m, followers) }))
    .filter((m): m is { media: Media; rate: number } => m.rate !== null)
    .sort((a, b) => b.rate - a.rate);
  const mid = Math.floor(rates.length / 2);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => ({
    day,
    posts: media.filter((m) => new Date(m.timestamp).getUTCDay() === i).length,
  }));
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    posts: media.filter((m) => new Date(m.timestamp).getUTCHours() === hour).length,
  }));
  const types = ['REEL', 'IMAGE', 'CAROUSEL_ALBUM', 'VIDEO'].map((type) => ({
    type,
    count: media.filter((m) => m.type === type).length,
    engagement: average(media.filter((m) => m.type === type).map((m) => engagement(m, followers))),
  }));
  return {
    total: media.length,
    average_likes: average(media.map((m) => m.likes)),
    average_comments: average(media.map((m) => m.comments)),
    average_views: average(media.map((m) => m.views)),
    average_engagement: average(rates.map((r) => r.rate)),
    median_engagement: rates.length
      ? rates.length % 2
        ? rates[mid].rate
        : (rates[mid - 1].rate + rates[mid].rate) / 2
      : null,
    best: rates[0]?.media ?? null,
    worst: rates.at(-1)?.media ?? null,
    weekdays,
    hours,
    types,
    most_active_day: [...weekdays].sort((a, b) => b.posts - a.posts)[0]?.day ?? null,
    most_active_hour: [...hours].sort((a, b) => b.posts - a.posts)[0]?.hour ?? null,
    source: 'derived',
    formula:
      '(likes + comments) / current observed followers × 100; current audience proxy, not audience at publication',
  };
}
export function dailyChanges(snapshots: Snapshot[]) {
  const sorted = [...snapshots].sort(
    (a, b) => Date.parse(a.retrieved_at) - Date.parse(b.retrieved_at),
  );
  return sorted
    .slice(1)
    .flatMap((s, i) =>
      s.followers_count !== null && sorted[i].followers_count !== null
        ? [
            (s.followers_count - sorted[i].followers_count!) /
              Math.max(
                (Date.parse(s.retrieved_at) - Date.parse(sorted[i].retrieved_at)) / DAY,
                1 / 24,
              ),
          ]
        : [],
    );
}
export function growthSummary(
  snapshots: Snapshot[],
  metric: 'followers_count' | 'following_count' | 'media_count' = 'followers_count',
) {
  const sorted = [...snapshots].sort(
    (a, b) => Date.parse(a.retrieved_at) - Date.parse(b.retrieved_at),
  );
  const points = sorted.map((s) => ({ retrieved_at: s.retrieved_at, followers_count: s[metric] }));
  const last = points.at(-1),
    previous = points.at(-2);
  const changes = points
    .slice(1)
    .flatMap((p, i) =>
      p.followers_count !== null && points[i].followers_count !== null
        ? [
            (p.followers_count - points[i].followers_count!) /
              Math.max(
                (Date.parse(p.retrieved_at) - Date.parse(points[i].retrieved_at)) / DAY,
                1 / 24,
              ),
          ]
        : [],
    );
  return {
    metric,
    since_last:
      last && previous && last.followers_count !== null && previous.followers_count !== null
        ? last.followers_count - previous.followers_count
        : null,
    day: growth(points, 1),
    week: growth(points, 7),
    month: growth(points, 30),
    moving_daily_average:
      changes.length >= 7 ? changes.slice(-7).reduce((a, b) => a + b, 0) / 7 : null,
    spike: spike(changes),
    source: 'derived' as const,
  };
}
