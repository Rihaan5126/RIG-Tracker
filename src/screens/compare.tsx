'use client';
import { useState } from 'react';
import { useWorkspace } from '@/components/workspace-context';
import { Heading, Panel, Avatar, Empty, SourceBadge } from '@/components/ui';
import { ComparisonChart } from '@/components/charts';
import { growth, mediaAnalytics, DAY } from '@/domain/analytics';
import { number, percent, exportCsv } from '@/lib/client';
import { Download } from 'lucide-react';
export function Compare() {
  const { data } = useWorkspace(),
    [selected, setSelected] = useState(data.tracked.slice(0, 3).map((t) => t.profile_id)),
    [days, setDays] = useState(30);
  const profiles = data.profiles.filter((p) => selected.includes(p.id));
  const rows = profiles.map((p) => {
    const history = data.snapshots.filter((s) => s.profile_id === p.id),
      g = growth(history, days),
      allMedia = data.media.filter((m) => m.profile_id === p.id),
      end = Date.parse(history.at(-1)?.retrieved_at ?? ''),
      media = allMedia.filter((m) => Date.parse(m.timestamp) >= end - days * DAY),
      analytics = mediaAnalytics(media, p.followers_count),
      bestType =
        [...analytics.types]
          .filter((t) => t.engagement !== null)
          .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))[0]?.type ?? 'Unavailable';
    return {
      username: p.username,
      followers: p.followers_count,
      following: p.following_count,
      media_count: p.media_count,
      growth: g?.absolute ?? null,
      growth_percentage: g?.percentage ?? null,
      posts_per_week: (media.length / days) * 7,
      engagement: analytics.average_engagement,
      top_content_type: bestType,
    };
  });
  const latest = Math.max(
    ...data.snapshots
      .filter((s) => selected.includes(s.profile_id))
      .map((s) => Date.parse(s.retrieved_at)),
  );
  return (
    <>
      <Heading
        eyebrow="PERSPECTIVE THROUGH COMPARISON"
        title="Compare accounts"
        description="Put up to five tracked accounts side by side."
        actions={
          <button
            className="button"
            disabled={profiles.length < 2}
            onClick={() => exportCsv('rigtracker-comparison.csv', rows)}
          >
            <Download size={16} />
            Export comparison
          </button>
        }
      />
      <div className="toolbar">
        <div className="pill-row">
          {data.tracked.map((t) => (
            <button
              key={t.id}
              className={`filter-pill ${selected.includes(t.profile_id) ? 'active' : ''}`}
              onClick={() =>
                setSelected((current) =>
                  current.includes(t.profile_id)
                    ? current.filter((id) => id !== t.profile_id)
                    : current.length < 5
                      ? [...current, t.profile_id]
                      : current,
                )
              }
            >
              {t.profile.display_name}
            </button>
          ))}
        </div>
        <div className="segmented">
          {[7, 30, 90, 365].map((d) => (
            <button key={d} className={days === d ? 'selected' : ''} onClick={() => setDays(d)}>
              {d === 365 ? '1Y' : `${d}D`}
            </button>
          ))}
        </div>
      </div>
      {profiles.length < 2 ? (
        <Empty title="Select at least two tracked accounts">
          Choose between two and five accounts above. Add more accounts in Tracker.
        </Empty>
      ) : (
        <div className="stack">
          <Panel
            title="Followers over time"
            subtitle="Recorded observations only. Different accounts may have different observation dates."
          >
            <div className="content-pad">
              <ComparisonChart
                profiles={profiles}
                snapshots={data.snapshots.filter(
                  (s) =>
                    selected.includes(s.profile_id) &&
                    Date.parse(s.retrieved_at) >= latest - days * DAY,
                )}
              />
            </div>
          </Panel>
          <Panel title="Side-by-side intelligence" action={<SourceBadge source="derived" />}>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {profiles.map((p) => (
                      <th key={p.id}>
                        <div className="person-cell">
                          <Avatar profile={p} size="small" />
                          {p.display_name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Followers', 'followers'],
                    ['Following', 'following'],
                    ['Media count', 'media_count'],
                    [`${days}-day growth`, 'growth'],
                    ['Growth %', 'growth_percentage'],
                    ['Posts / week (sample)', 'posts_per_week'],
                    ['Engagement %', 'engagement'],
                    ['Top content type', 'top_content_type'],
                  ].map(([label, key]) => (
                    <tr key={key}>
                      <td className="muted">{label}</td>
                      {rows.map((row) => {
                        const val = row[key as keyof typeof row];
                        return (
                          <td
                            key={row.username}
                            className={key.includes('growth') ? 'positive' : ''}
                          >
                            {key === 'growth_percentage'
                              ? percent(val as number | null)
                              : key === 'engagement' || key === 'posts_per_week'
                                ? val === null
                                  ? '—'
                                  : `${Number(val).toFixed(2)}${key === 'engagement' ? '%' : ''}`
                                : typeof val === 'number'
                                  ? number(val)
                                  : (val ?? '—')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <p className="hint">
            Growth uses local snapshots. Posting frequency and engagement describe the available
            media sample; engagement uses current observed followers. No retrospective Instagram
            history is implied.
          </p>
        </div>
      )}
    </>
  );
}
