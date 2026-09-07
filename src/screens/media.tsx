'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Heart, MessageCircle, Eye, ArrowLeft, ExternalLink } from 'lucide-react';
import type { Media, Profile } from '@/domain/models';
import { useWorkspace } from '@/components/workspace-context';
import { Heading, Panel, Stat, SourceBadge, Empty, Hint, Unsupported } from '@/components/ui';
import { DistributionChart } from '@/components/charts';
import { engagement, mediaAnalytics, ratio, DAY } from '@/domain/analytics';
import { number, date } from '@/lib/client';
export function MediaArt({ item, index = 0 }: { item: Media; index?: number }) {
  return (
    <div className={`media-art art-${index % 4}`}>
      {item.thumbnail_url ? (
        <img alt={item.caption ?? 'Media thumbnail'} src={item.thumbnail_url} />
      ) : (
        <span className="art-caption">
          {item.caption?.split('.')[0] ?? 'Media preview unavailable'}
        </span>
      )}
      <span className="art-type">
        {item.source === 'mock' ? 'FICTIONAL · ' : ''}
        {item.type.replace('_ALBUM', '')}
      </span>
      <span className="art-index">{String(index + 1).padStart(2, '0')} / RIG</span>
    </div>
  );
}
export function MediaGrid({ items }: { items: Media[] }) {
  const [type, setType] = useState('ALL'),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1);
  const filtered = items.filter(
    (m) =>
      (type === 'ALL' || m.type === type) &&
      `${m.caption} ${m.username}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="toolbar">
        <div className="pill-row">
          {['ALL', 'REEL', 'IMAGE', 'CAROUSEL_ALBUM', 'VIDEO'].map((t) => (
            <button
              key={t}
              className={`filter-pill ${type === t ? 'active' : ''}`}
              onClick={() => {
                setType(t);
                setPage(1);
              }}
            >
              {t === 'ALL'
                ? 'All media'
                : t === 'CAROUSEL_ALBUM'
                  ? 'Carousels'
                  : t === 'REEL'
                    ? 'Reels'
                    : t === 'IMAGE'
                      ? 'Images'
                      : 'Videos'}
            </button>
          ))}
        </div>
        <input
          aria-label="Search media"
          placeholder="Search captions or accounts…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="media-grid">
        {filtered.slice((page - 1) * 16, page * 16).map((m, i) => (
          <Link href={`/media/${encodeURIComponent(m.id)}`} className="media-card" key={m.id}>
            <MediaArt item={m} index={i} />
            <div className="media-content">
              <p>{m.caption ?? 'Caption unavailable'}</p>
              <small>
                @{m.username} · {date(m.timestamp)}
              </small>
              <div className="media-counts">
                <span>
                  <Heart size={13} />
                  {number(m.likes, true)}
                </span>
                <span>
                  <MessageCircle size={13} />
                  {number(m.comments, true)}
                </span>
                <span>
                  <Eye size={13} />
                  {number(m.views, true)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <Empty title="No media in this selection">
          Adjust the filters, or connect an account with available media.
        </Empty>
      )}
      {filtered.length > 16 && (
        <div className="pagination">
          <span>
            {filtered.length} items · page {page} of {Math.ceil(filtered.length / 16)}
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
              disabled={page * 16 >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
export function MediaScreen({ id }: { id?: string }) {
  const { data } = useWorkspace();
  if (!id)
    return (
      <>
        <Heading
          eyebrow="CONTENT, WITH CONTEXT"
          title="Media analyzer"
          description="Explore posts, carousels and reels from your available accounts."
        />
        <MediaGrid items={data.media} />
      </>
    );
  const m = data.media.find((m) => m.id === decodeURIComponent(id));
  if (!m)
    return (
      <Empty title="Media unavailable">
        This media item is not available through your workspace’s configured provider.
      </Empty>
    );
  const p = data.profiles.find((p) => p.id === m.profile_id);
  const interactions = m.likes === null || m.comments === null ? null : m.likes + m.comments;
  return (
    <>
      <Heading
        eyebrow="MEDIA INTELLIGENCE"
        title={m.type === 'REEL' ? 'Reel analysis' : 'Media analysis'}
        actions={
          <Link className="button" href="/media">
            <ArrowLeft size={15} />
            All media
          </Link>
        }
      />
      <div className="reel-detail">
        <MediaArt item={m} />
        <div className="stack">
          <div>
            <div className="detail-heading">
              <SourceBadge source={m.source} />
              <span className="muted">{date(m.timestamp, true)} UTC</span>
            </div>
            <h2>{m.caption ?? 'Caption unavailable'}</h2>
            <Link className="text-link" style={{ marginTop: 12 }} href={`/profile/${m.username}`}>
              @{m.username}
            </Link>
          </div>
          <div
            className="stats-grid"
            style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', marginBottom: 0 }}
          >
            {[
              ['Views', m.views],
              ['Reach', m.reach],
              ['Likes', m.likes],
              ['Comments', m.comments],
              ['Shares', m.shares],
              ['Saves', m.saved],
            ].map(([label, value]) => (
              <Stat
                key={label}
                title={String(label)}
                value={number(value as number | null)}
                detail={<SourceBadge source={value === null ? 'unavailable' : m.source} />}
              />
            ))}
          </div>
          <Panel title="Performance ratios">
            <div className="content-pad">
              <dl className="profile-detail-list">
                {[
                  ['Engagement / view', ratio(interactions, m.views)],
                  ['Engagement / reach', ratio(interactions, m.reach)],
                  ['Share rate / views', ratio(m.shares, m.views)],
                  ['Save rate / views', ratio(m.saved, m.views)],
                  ['Engagement / current followers', engagement(m, p?.followers_count ?? null)],
                  ['Duration (seconds)', m.duration],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      {value === null
                        ? 'Unavailable'
                        : `${Number(value).toFixed(2)}${String(label).startsWith('Duration') ? 's' : '%'}`}
                    </dd>
                  </div>
                ))}
              </dl>
              <Hint>
                Engagement uses likes + comments. Ratios require a nonzero denominator. Shares and
                saves are divided by views; audience rate uses the current observed follower count.
              </Hint>
            </div>
          </Panel>
          <Unsupported>
            Watch time and legacy impressions are unavailable in the default provider. Missing
            metrics are not treated as zero.
          </Unsupported>
          {m.permalink && (
            <a href={m.permalink} className="button" target="_blank" rel="noreferrer">
              Open on Instagram <ExternalLink size={15} />
            </a>
          )}
        </div>
      </div>
    </>
  );
}
export function Analytics({ profile, items }: { profile: Profile; items: Media[] }) {
  const [days, setDays] = useState(30);
  const end = Math.max(...items.map((m) => Date.parse(m.timestamp)));
  const media = items.filter((m) => Date.parse(m.timestamp) >= end - days * DAY),
    a = mediaAnalytics(media, profile.followers_count);
  return (
    <div className="stack">
      <div className="toolbar">
        <div>
          <h2>Content performance</h2>
          <p className="hint">
            Available sample only · period ends at latest retrieved media · UTC
          </p>
        </div>
        <div className="segmented">
          {[7, 30, 90, 365].map((d) => (
            <button key={d} className={days === d ? 'selected' : ''} onClick={() => setDays(d)}>
              {d === 365 ? '1Y' : `${d}D`}
            </button>
          ))}
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          title="Posts in sample period"
          value={a.total}
          detail={`${((a.total / days) * 7).toFixed(1)} posts / week · sample`}
        />
        <Stat
          title="Average likes"
          value={number(a.average_likes)}
          detail={`${number(a.average_comments)} average comments`}
        />
        <Stat
          title="Average views"
          value={number(a.average_views)}
          detail="Only items with returned views"
        />
        <Stat
          title="Average engagement"
          value={a.average_engagement === null ? '—' : `${a.average_engagement.toFixed(2)}%`}
          detail={`Median ${a.median_engagement?.toFixed(2) ?? '—'}%`}
        />
      </div>
      <div className="formula">{a.formula}</div>
      <div className="two-column">
        <Panel
          title="Posts by weekday"
          subtitle={`Most frequent: ${a.most_active_day ?? 'Unavailable'} · UTC`}
        >
          <div className="content-pad">
            <DistributionChart data={a.weekdays} />
          </div>
        </Panel>
        <Panel title="Content mix" subtitle="Publishing distribution in the available sample">
          <div className="content-pad">
            <DistributionChart
              data={a.types.map((t) => ({ ...t, type: t.type.replace('_ALBUM', '') }))}
              x="type"
              y="count"
              color="#bea9f7"
            />
          </div>
        </Panel>
        <Panel
          title="Posts by hour"
          subtitle={`Most frequent: ${a.most_active_hour ?? '—'}:00 UTC`}
        >
          <div className="content-pad">
            <DistributionChart data={a.hours} x="hour" color="#8dc5fa" />
          </div>
        </Panel>
        <Panel title="Performance highlights" subtitle="Ranked by engagement / current followers">
          <div className="content-pad stack">
            {[
              ['Best-performing', a.best],
              ['Lowest-performing', a.worst],
            ].map(([label, item]) => {
              const m = item as Media | null;
              return (
                <div key={String(label)}>
                  <span className="eyebrow">{String(label)}</span>
                  {m ? (
                    <Link href={`/media/${encodeURIComponent(m.id)}`}>
                      <h3>{m.caption?.split('.')[0]}</h3>
                      <p className="positive">
                        {engagement(m, profile.followers_count)?.toFixed(2)}% ·{' '}
                        {m.type.replace('_ALBUM', '')}
                      </p>
                    </Link>
                  ) : (
                    <span>Unavailable</span>
                  )}
                </div>
              );
            })}
            <SourceBadge source="derived" />
          </div>
        </Panel>
      </div>
      <Hint>
        Statistics describe the fetched sample, which can be smaller than the profile’s total media
        count. The live adapter currently fetches the latest 50 accessible media items. Historical
        metrics are not invented.
      </Hint>
    </div>
  );
}
