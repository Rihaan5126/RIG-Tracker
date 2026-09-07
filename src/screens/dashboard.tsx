'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  ScanLine,
  Zap,
  Clapperboard,
  TrendingUp,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import { Heading, Stat, Panel, Avatar, ViewLink, Empty } from '@/components/ui';
import { GrowthChart, MiniChart } from '@/components/charts';
import { TrackerForm } from '@/components/tracker-form';
import { growth, DAY } from '@/domain/analytics';
import { number, percent, date } from '@/lib/client';
export function Dashboard() {
  const { data } = useWorkspace(),
    [now] = useState(Date.now),
    [adding, setAdding] = useState(false),
    [days, setDays] = useState(30),
    [account, setAccount] = useState(data.profiles[0]?.id ?? '');
  const profile = data.profiles.find((p) => p.id === account) ?? data.profiles[0];
  const all = data.snapshots.filter((s) => s.profile_id === profile?.id),
    latest = all.at(-1),
    history = all.filter(
      (s) => Date.parse(s.retrieved_at) >= Date.parse(latest?.retrieved_at ?? '') - days * DAY,
    );
  const g = growth(all, days);
  const today = new Date().toISOString().slice(0, 10),
    events = data.events.filter((e) => e.detected_at.startsWith(today));
  const recent = data.events
    .filter((e) => !['followers_count', 'following_count', 'media_count'].includes(e.event_type))
    .slice(0, 5);
  const growing = data.profiles
    .map((p) => ({
      profile: p,
      growth: growth(
        data.snapshots.filter((s) => s.profile_id === p.id),
        30,
      ),
    }))
    .sort((a, b) => (b.growth?.percentage ?? 0) - (a.growth?.percentage ?? 0));
  const active = data.tracked.filter((t) => t.enabled).length;
  return (
    <>
      <Heading
        eyebrow="YOUR WORKSPACE, AT A GLANCE"
        title="Overview"
        description="Every change tells a story. Stay ahead of yours."
        actions={
          <>
            <span className="date-chip">
              <CalendarDays size={15} />
              {date(new Date().toISOString())}
            </span>
            <button className="button primary" onClick={() => setAdding(true)}>
              <Plus size={17} />
              Track account
            </button>
          </>
        }
      />
      <div className="stats-grid">
        <Stat
          title="Tracked accounts"
          value={number(data.tracked.length)}
          detail={
            <>
              <span className="tiny-dot" />
              {active} active trackers
            </>
          }
          icon={<ScanLine size={18} />}
        />
        <Stat
          title="Events today"
          value={number(events.length)}
          detail="From recorded observations"
          icon={<Zap size={18} />}
          positive={false}
        />
        <Stat
          title="New media"
          value={number(data.media.filter((m) => m.timestamp.startsWith(today)).length)}
          detail="Published today · available sample"
          icon={<Clapperboard size={18} />}
          positive={false}
        />
        <Stat
          title="Growth alerts"
          value={number(
            data.events.filter(
              (e) => e.event_type === 'growth_spike' && Date.parse(e.detected_at) > now - 7 * DAY,
            ).length,
          )}
          detail="Unusual growth · past 7 days"
          icon={<TrendingUp size={18} />}
        />
      </div>
      <div className="dashboard-grid">
        <Panel
          className="growth-panel"
          title="Audience growth"
          subtitle="A clearer picture, one observation at a time."
          action={
            <div className="segmented">
              {[7, 30, 90, 365].map((n) => (
                <button key={n} className={days === n ? 'selected' : ''} onClick={() => setDays(n)}>
                  {n === 365 ? '1Y' : `${n}D`}
                </button>
              ))}
            </div>
          }
        >
          {profile ? (
            <>
              <div className="chart-summary">
                <div>
                  <span className="chart-number">{number(profile.followers_count)}</span>
                  <span className="growth-pill">
                    <ArrowUpRight size={14} />
                    {percent(g?.percentage)}
                  </span>
                  <p>
                    Total followers{' '}
                    <span>· {days === 365 ? 'past year' : `past ${days} days`}</span>
                  </p>
                </div>
                <div className="account-picker">
                  <Avatar profile={profile} size="small" />
                  <select
                    aria-label="Chart account"
                    value={profile.id}
                    onChange={(e) => setAccount(e.target.value)}
                  >
                    {data.profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
              <GrowthChart snapshots={history} color={profile.color} />
              <div className="chart-foot">
                <span>
                  <i />
                  Observed followers
                </span>
                <span>
                  {data.provider === 'mock'
                    ? 'Fictional snapshots'
                    : 'RIGtracker historical observations'}{' '}
                  · no interpolated values
                </span>
              </div>
            </>
          ) : (
            <Empty title="Your history starts here">
              Connect an authorized account to begin recording observations.
            </Empty>
          )}
        </Panel>
        <Panel
          title="Tracking health"
          subtitle="Your monitoring, in focus."
          action={<ScanLine size={18} className="muted" />}
        >
          <div className="health-display">
            <div
              className="health-ring"
              style={
                {
                  '--health': `${data.tracked.length ? (active / data.tracked.length) * 100 : 0}%`,
                } as React.CSSProperties
              }
            >
              <span>
                {data.tracked.length ? Math.round((active / data.tracked.length) * 100) : 0}
                <small>%</small>
              </span>
            </div>
            <strong>
              {data.tracked.some((t) => t.failures)
                ? 'Some trackers need attention'
                : 'Trackers configured'}
            </strong>
            <p>
              {data.worker_last_seen && now - Date.parse(data.worker_last_seen) < 180000
                ? 'Worker is checking the schedule'
                : 'Start the worker for scheduled refreshes'}
            </p>
          </div>
          <div className="health-rows">
            <div>
              <span>
                <i className="dot mint" />
                Active trackers
              </span>
              <b>{active}</b>
            </div>
            <div>
              <span>
                <i className="dot violet" />
                Paused
              </span>
              <b>{data.tracked.length - active}</b>
            </div>
            <div>
              <span>
                <i className="dot amber" />
                Need attention
              </span>
              <b>{data.tracked.filter((t) => t.failures > 0).length}</b>
            </div>
          </div>
          <Link className="health-link" href="/tracker">
            Manage trackers <ArrowUpRight size={16} />
          </Link>
        </Panel>
        <Panel
          title="Recent changes"
          subtitle="The updates that deserve a closer look."
          action={<ViewLink href="/history" />}
        >
          <div className="recent-events">
            {recent.map((e) => {
              const p = data.profiles.find((p) => p.id === e.profile_id)!;
              return (
                <Link key={e.id} href={`/history/${p.username}`} className="recent-event">
                  <span
                    className={`event-icon ${e.event_type === 'growth_spike' ? 'mint' : 'violet'}`}
                  >
                    {e.event_type === 'growth_spike' ? <TrendingUp size={17} /> : <Zap size={17} />}
                  </span>
                  <div>
                    <strong>
                      {e.event_type === 'growth_spike'
                        ? 'Growth spike detected'
                        : `${e.event_type.replaceAll('_', ' ')} changed`}
                    </strong>
                    <p>@{p.username}</p>
                  </div>
                  <time>{date(e.detected_at)}</time>
                  <ArrowUpRight size={15} />
                </Link>
              );
            })}
            {!recent.length && (
              <Empty title="No changes yet">Future observations will appear here.</Empty>
            )}
          </div>
        </Panel>
        <Panel
          title="Fastest growing"
          subtitle="Follower growth over the past 30 days."
          action={<ViewLink href="/compare">Compare</ViewLink>}
        >
          <div className="growth-list">
            {growing.slice(0, 4).map((item, i) => (
              <Link key={item.profile.id} href={`/profile/${item.profile.username}`}>
                <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                <Avatar profile={item.profile} />
                <div className="growth-person">
                  <strong>{item.profile.display_name}</strong>
                  <small>{number(item.profile.followers_count, true)} followers</small>
                </div>
                <MiniChart
                  color={item.profile.color}
                  values={data.snapshots
                    .filter((s) => s.profile_id === item.profile.id)
                    .slice(-30)
                    .map((s) => s.followers_count)}
                />
                <span className="positive">{percent(item.growth?.percentage)}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
      <Panel
        title="Recently updated accounts"
        subtitle="Your latest profile observations, all in one place."
        action={<ViewLink href="/tracker">View tracker</ViewLink>}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Followers</th>
                <th>30D growth</th>
                <th>Media</th>
                <th>Tracking</th>
                <th>Last observation</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.profiles.slice(0, 4).map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link className="person-cell" href={`/profile/${p.username}`}>
                      <Avatar profile={p} />
                      <span>
                        <strong>{p.display_name}</strong>
                        <small>@{p.username}</small>
                      </span>
                    </Link>
                  </td>
                  <td className="numeric">{number(p.followers_count)}</td>
                  <td className="positive">
                    {percent(
                      growth(
                        data.snapshots.filter((s) => s.profile_id === p.id),
                        30,
                      )?.percentage,
                    )}
                  </td>
                  <td>{number(p.media_count)}</td>
                  <td>
                    <span className="status">
                      <CheckCircle2 size={13} />
                      {data.tracked.find((t) => t.profile_id === p.id)?.enabled
                        ? 'Enabled'
                        : 'Paused'}
                    </span>
                  </td>
                  <td className="muted">
                    <Clock size={12} className="inline-icon" />
                    {date(p.retrieved_at)}
                  </td>
                  <td>
                    <Link href={`/profile/${p.username}`} aria-label={`Open ${p.username}`}>
                      <ArrowUpRight size={17} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {adding && <TrackerForm onClose={() => setAdding(false)} />}
    </>
  );
}
