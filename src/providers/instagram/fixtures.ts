import type { Profile, Snapshot, Media, TrackingEvent } from '@/domain/models';
import { diffProfiles, DAY, spike, dailyChanges } from '@/domain/analytics';
export const DEMO_ACCOUNTS = [
  {
    username: 'rigtracker_demo',
    name: 'RIG Studio',
    color: '#a4f2ce',
    base: 68520,
    rate: 118,
    bio: 'Independent ideas. Intentional design.\nA fictional creative studio, built for the RIGtracker demo.',
    website: 'https://example.com/rig-studio',
  },
  {
    username: 'northline_demo',
    name: 'Northline Supply',
    color: '#bea9f7',
    base: 38500,
    rate: 64,
    bio: 'Objects for a slower, more considered everyday. Fictional demo brand.',
    website: 'https://example.com/northline',
  },
  {
    username: 'formandfield_demo',
    name: 'Form & Field',
    color: '#f0ba84',
    base: 22700,
    rate: 45,
    bio: 'A journal of architecture, materials and places. Fictional demo.',
    website: 'https://example.com/form-field',
  },
  {
    username: 'mila_creates_demo',
    name: 'Mila Creates',
    color: '#8dc5fa',
    base: 51300,
    rate: 91,
    bio: 'Making room for good ideas. A fictional creator account.',
    website: 'https://example.com/mila',
  },
  {
    username: 'offgrid_demo',
    name: 'Offgrid Journal',
    color: '#f099b0',
    base: 18400,
    rate: 35,
    bio: 'Stories from outside the ordinary. Fictional editorial account.',
    website: 'https://example.com/offgrid',
  },
];
export function fixtures(now = new Date()) {
  const end = new Date(now);
  end.setUTCMinutes(0, 0, 0);
  const profiles: Profile[] = [],
    snapshots: Snapshot[] = [],
    media: Media[] = [],
    events: TrackingEvent[] = [];
  DEMO_ACCOUNTS.forEach((a, index) => {
    const id = `demo-${index + 1}`;
    let followers = a.base;
    const own: Snapshot[] = [];
    for (let day = 0; day <= 365; day++) {
      followers +=
        a.rate +
        Math.round(Math.sin(day * 0.47 + index) * a.rate * 0.6) +
        (day === 110 || day === 241 || day === 362 ? a.rate * 19 : 0);
      const phase = day < 140 ? 0 : day < 300 ? 1 : 2;
      const p: Snapshot = {
        id: `${id}-s-${day}`,
        profile_id: id,
        provider: 'mock',
        instagram_id: id,
        username: phase === 0 ? `${a.username.replace('_demo', '')}_archive_demo` : a.username,
        display_name: phase === 0 ? `${a.name} Archive` : a.name,
        biography:
          phase === 0
            ? 'An evolving collection of ideas. Fictional RIGtracker fixture.'
            : phase === 1
              ? 'A new chapter in independent creativity. Fictional demo.'
              : a.bio,
        profile_picture_url: `/avatars/${index}-${phase}.svg`,
        website: day < 320 ? 'https://example.com/archive' : a.website,
        followers_count: followers,
        following_count: 412 + index * 39 + Math.round(Math.sin(day / 19) * 8),
        media_count: 106 + Math.floor(day / 3) + index * 15,
        account_type: index === 3 ? 'CREATOR' : 'BUSINESS',
        verified: null,
        source: 'mock',
        field_sources: {},
        retrieved_at: new Date(end.getTime() - (365 - day) * DAY).toISOString(),
      };
      p.field_sources = Object.fromEntries(
        Object.entries(p)
          .filter(([k]) => k !== 'field_sources')
          .map(([k, v]) => [k, v === null ? 'unavailable' : 'mock']),
      );
      const last = own.at(-1);
      if (last)
        for (const diff of diffProfiles(last, p))
          events.push({
            id: `${p.id}-${diff.event_type}`,
            profile_id: id,
            snapshot_id: p.id,
            ...diff,
            detected_at: p.retrieved_at,
            username: a.username,
            source: 'mock',
          });
      own.push(p);
      if (day > 30 && spike(dailyChanges(own)).detected)
        events.push({
          id: `${p.id}-growth_spike`,
          profile_id: id,
          snapshot_id: p.id,
          event_type: 'growth_spike',
          old_value: null,
          new_value: followers - last!.followers_count!,
          detected_at: p.retrieved_at,
          username: a.username,
          source: 'mock',
        });
    }
    snapshots.push(...own);
    profiles.push({ ...own.at(-1)!, id, color: a.color });
    for (let i = 0; i < 48; i++) {
      const types: Media['type'][] = ['REEL', 'CAROUSEL_ALBUM', 'IMAGE', 'REEL', 'IMAGE', 'VIDEO'];
      const type = types[i % 6],
        likes = 820 + ((i * 197 + index * 337) % 4700),
        comments = 22 + ((i * 13) % 281);
      const titles = [
        'A different perspective',
        'Good things take shape',
        'Notes from the studio',
        'Finding the extraordinary in the everyday',
        'Behind the process',
        'A little space for inspiration',
        'Made with intention',
        'The details make the difference',
      ];
      const m: Media = {
        id: `${id}-m-${i}`,
        profile_id: id,
        username: a.username,
        type,
        caption: `${titles[i % 8]}. A fictional ${a.name} post for the RIGtracker demo.`,
        permalink: null,
        thumbnail_url: null,
        media_url: null,
        timestamp: new Date(end.getTime() - i * 2 * DAY - (i % 12) * 3600000).toISOString(),
        likes,
        comments,
        views: type === 'REEL' || type === 'VIDEO' ? likes * 19 : null,
        reach: likes * 11,
        saved: Math.round(likes * 0.11),
        shares: Math.round(likes * 0.07),
        impressions: null,
        duration: type === 'REEL' ? 18 + (i % 30) : null,
        source: 'mock',
        field_sources: {},
      };
      m.field_sources = Object.fromEntries(
        Object.entries(m)
          .filter(([k]) => k !== 'field_sources')
          .map(([k, v]) => [k, v === null ? 'unavailable' : 'mock']),
      );
      media.push(m);
    }
  });
  return { profiles, snapshots, media, events };
}
