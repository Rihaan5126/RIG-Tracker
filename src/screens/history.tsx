'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Download, ArrowRight, TrendingUp, Zap } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import { Heading, Panel, Empty, SourceBadge } from '@/components/ui';
import { GrowthChart } from '@/components/charts';
import { DAY } from '@/domain/analytics';
import { date, number, percent, exportCsv } from '@/lib/client';
const filters = [
  ['All changes', 'all'],
  ['Username', 'username'],
  ['Biography', 'biography'],
  ['Avatar', 'profile_picture_url'],
  ['Website', 'website'],
  ['Followers', 'followers_count'],
  ['Following', 'following_count'],
  ['Media', 'media'],
  ['Other', 'other'],
] as const;
export function HistoryView({
  username,
  embedded = false,
  changesOnly = false,
}: {
  username?: string;
  embedded?: boolean;
  changesOnly?: boolean;
}) {
  const { data } = useWorkspace(),
    [account, setAccount] = useState(username ?? data.profiles[0]?.username ?? ''),
    [days, setDays] = useState(30),
    [filter, setFilter] = useState(changesOnly ? 'other' : 'all'),
    [metric, setMetric] = useState<'followers_count' | 'following_count' | 'media_count'>(
      'followers_count',
    ),
    [page, setPage] = useState(1);
  const profile = data.profiles.find((p) => p.username === account),
    all = data.snapshots.filter((s) => s.profile_id === profile?.id),
    end = Date.parse(all.at(-1)?.retrieved_at ?? ''),
    history = all.filter((s) => days === 0 || Date.parse(s.retrieved_at) >= end - days * DAY);
  const events = data.events.filter(
    (e) =>
      e.profile_id === profile?.id &&
      (days === 0 || Date.parse(e.detected_at) >= end - days * DAY) &&
      (filter === 'all' ||
        (filter === 'media' && ['new_media', 'media_count'].includes(e.event_type)) ||
        (filter === 'other' &&
          ![
            'username',
            'biography',
            'profile_picture_url',
            'website',
            'followers_count',
            'following_count',
            'media_count',
            'new_media',
          ].includes(e.event_type)) ||
        filter === e.event_type),
  );
  return (
    <>
      {!embedded && (
        <Heading
          eyebrow="THE OBSERVATION ARCHIVE"
          title="History"
          description="What changed. When it changed. The full context."
          actions={
            <button
              className="button"
              onClick={() =>
                exportCsv(
                  `${account}-events.csv`,
                  events.map((e) => ({ ...e })),
                )
              }
            >
              <Download size={15} />
              Export events
            </button>
          }
        />
      )}
      <div className="toolbar">
        {!embedded && (
          <select
            aria-label="History account"
            value={account}
            onChange={(e) => {
              setAccount(e.target.value);
              setPage(1);
            }}
          >
            {data.profiles.map((p) => (
              <option key={p.id} value={p.username}>
                @{p.username}
              </option>
            ))}
          </select>
        )}
        <div className="segmented">
          {[
            [1, '24H'],
            [7, '7D'],
            [30, '30D'],
            [90, '90D'],
            [365, '1Y'],
            [0, 'All'],
          ].map(([n, label]) => (
            <button
              key={n}
              className={days === n ? 'selected' : ''}
              onClick={() => {
                setDays(Number(n));
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          aria-label="History chart metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
        >
          <option value="followers_count">Followers</option>
          <option value="following_count">Following</option>
          <option value="media_count">Media count</option>
        </select>
      </div>
      <div className="stack">
        <Panel
          title={`${metric.replaceAll('_', ' ')} over time`}
          subtitle={`${history.length} recorded observations · gaps are not interpolated`}
        >
          <GrowthChart snapshots={history} metric={metric} color={profile?.color} />
        </Panel>
        <div className="pill-row">
          {filters.map(([label, value]) => (
            <button
              key={value}
              className={`filter-pill ${filter === value ? 'active' : ''}`}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <Panel title="Change timeline" subtitle={`${events.length} events in this selection`}>
          <div className="timeline">
            {events.slice((page - 1) * 20, page * 20).map((e) => {
              const numeric = typeof e.old_value === 'number' && typeof e.new_value === 'number',
                delta = numeric ? Number(e.new_value) - Number(e.old_value) : null;
              return (
                <article className="timeline-event" key={e.id}>
                  <span
                    className={`event-icon ${e.event_type === 'growth_spike' ? 'mint' : 'violet'}`}
                  >
                    {e.event_type === 'growth_spike' ? <TrendingUp size={17} /> : <Zap size={17} />}
                  </span>
                  <div className="timeline-content">
                    <header>
                      <h3>
                        {e.event_type === 'growth_spike'
                          ? 'Unusual follower growth detected'
                          : e.event_type.replaceAll('_', ' ')}
                      </h3>
                      <time>{date(e.detected_at, true)} UTC</time>
                    </header>
                    <Link href={`/profile/${profile?.username}`} className="timeline-account">
                      @{e.username}
                    </Link>
                    <div className="diff">
                      {e.event_type === 'profile_picture_url' ? (
                        <>
                          <img alt="Previous profile photo" src={String(e.old_value)} />
                          <ArrowRight size={15} />
                          <img alt="New profile photo" src={String(e.new_value)} />
                        </>
                      ) : (
                        <>
                          <del>
                            {numeric
                              ? number(Number(e.old_value))
                              : String(e.old_value ?? 'Unavailable')}
                          </del>
                          <ArrowRight size={15} />
                          <ins>
                            {numeric
                              ? number(Number(e.new_value))
                              : String(e.new_value ?? 'Unavailable')}
                          </ins>
                          {numeric && (
                            <span className={delta! >= 0 ? 'positive' : 'negative'}>
                              {delta! >= 0 ? '+' : ''}
                              {number(delta)} (
                              {Number(e.old_value) > 0
                                ? percent((delta! / Number(e.old_value)) * 100)
                                : '—'}
                              )
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <SourceBadge source={e.source} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!events.length && (
            <Empty title="No changes in this selection">
              Try a wider date range or another field.
            </Empty>
          )}
        </Panel>
        {events.length > 20 && (
          <div className="pagination">
            <span>
              Page {page} of {Math.ceil(events.length / 20)}
            </span>
            <div className="heading-actions">
              <button
                className="button small"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="button small"
                disabled={page * 20 >= events.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
