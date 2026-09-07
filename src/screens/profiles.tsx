'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  Search,
  ArrowUpRight,
  Bookmark,
  RefreshCw,
  Plus,
  ExternalLink,
  Download,
} from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import {
  Avatar,
  Heading,
  Panel,
  SourceBadge,
  Stat,
  Empty,
  Unsupported,
  Hint,
} from '@/components/ui';
import { GrowthChart } from '@/components/charts';
import { TrackerForm } from '@/components/tracker-form';
import { growth } from '@/domain/analytics';
import { api, number, percent, date, exportCsv } from '@/lib/client';
import { HistoryView } from './history';
import { MediaGrid, Analytics } from './media';
export function Lookup() {
  const { data } = useWorkspace(),
    router = useRouter(),
    [search, setSearch] = useState(''),
    [error, setError] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    const name = search.trim().replace(/^@/, '');
    if (!/^[A-Za-z0-9_.]{1,30}$/.test(name)) {
      setError('Enter a valid username.');
      return;
    }
    router.push(`/profile/${name.toLowerCase()}`);
  }
  return (
    <>
      <Heading
        eyebrow="PROFILE INTELLIGENCE"
        title="Look a little closer."
        description="Find an available account and put its latest data in context."
      />
      <div className="lookup-box">
        <h2>Start with a username</h2>
        <form onSubmit={submit} className="lookup-form">
          <input
            aria-label="Instagram username"
            placeholder="Try @rigtracker_demo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            required
          />
          <button className="button primary">
            <Search size={17} />
            Look up profile
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
        <p className="hint" style={{ marginTop: 13 }}>
          The demo includes five fictional accounts. The Meta provider is limited to your connected
          professional account.
        </p>
      </div>
      <Heading title="Explore your accounts" />
      <div className="profile-grid">
        {data.profiles.map((p) => (
          <Link href={`/profile/${p.username}`} className="profile-tile" key={p.id}>
            <div className="detail-heading">
              <Avatar profile={p} />
              <ArrowUpRight size={17} className="muted" />
            </div>
            <SourceBadge source={p.source} />
            <h3>{p.display_name ?? p.username}</h3>
            <p>@{p.username}</p>
            <div className="tile-metrics">
              <span>
                <strong>{number(p.followers_count, true)}</strong>
                <small>Followers</small>
              </span>
              <span>
                <strong className="positive">
                  {percent(
                    growth(
                      data.snapshots.filter((s) => s.profile_id === p.id),
                      30,
                    )?.percentage,
                  )}
                </strong>
                <small>30-day growth</small>
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!data.profiles.length && (
        <Empty title="No connected profiles">Connect Instagram in Settings to begin.</Empty>
      )}
    </>
  );
}
export function ProfileView({ username }: { username: string }) {
  const { data, reload, toast } = useWorkspace(),
    [tab, setTab] = useState('Overview'),
    [tracking, setTracking] = useState(false),
    [busy, setBusy] = useState(false);
  const p = data.profiles.find((p) => p.username === username),
    snapshots = data.snapshots.filter((s) => s.profile_id === p?.id),
    media = data.media.filter((m) => m.profile_id === p?.id),
    saved = data.saved.find((s) => s.profile.id === p?.id),
    tracked = data.tracked.find((t) => t.profile_id === p?.id);
  if (!p)
    return (
      <>
        <Heading
          title={`@${username}`}
          description="This account is not available in your workspace."
        />
        <Unsupported>
          Instagram currently does not expose arbitrary profile lookup through the configured
          official API. In demo mode, search for @rigtracker_demo or one of the four other fictional
          accounts.
        </Unsupported>
        <Link className="button" style={{ marginTop: 20 }} href="/lookup">
          Explore available profiles
        </Link>
      </>
    );
  async function refresh() {
    setBusy(true);
    try {
      const result = await api<{ changed: boolean }>(
        `/api/v1/profile/${p!.username}/refresh`,
        'POST',
      );
      await reload();
      toast(
        result.changed
          ? 'New observation recorded.'
          : 'Profile checked. No new changes; duplicate snapshot skipped.',
      );
    } catch (e) {
      toast(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    try {
      await api(
        saved ? `/api/v1/saved/${saved.id}` : '/api/v1/saved',
        saved ? 'DELETE' : 'POST',
        saved ? undefined : { username: p!.username, tags: ['Research'] },
      );
      await reload();
      toast(
        saved
          ? 'Account removed from saved profiles.'
          : 'Account saved. Add notes in Saved Accounts.',
      );
    } catch (e) {
      toast(String(e));
    }
  }
  const g = growth(snapshots, 30);
  return (
    <>
      <Heading
        eyebrow="PROFILE INTELLIGENCE"
        title="Profile overview"
        actions={
          <button
            className="button"
            onClick={() =>
              exportCsv(
                `${p.username}-snapshots.csv`,
                snapshots.map((s) => ({ ...s, field_sources: JSON.stringify(s.field_sources) })),
              )
            }
          >
            <Download size={15} />
            Export history
          </button>
        }
      />
      <section className="panel profile-card">
        <div className="profile-top">
          <Avatar profile={p} size="large" />
          <div className="profile-identity">
            <h1>{p.display_name ?? p.username}</h1>
            <div className="handle">@{p.username}</div>
            <p>{p.biography ?? 'Biography unavailable'}</p>
            {p.website && (
              <a className="website" href={p.website} target="_blank" rel="noreferrer">
                <ExternalLink size={13} />
                {p.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
          <div className="heading-actions">
            <button className="button" onClick={() => void save()}>
              <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
              {saved ? 'Saved' : 'Save'}
            </button>
            <button className="button" onClick={() => void refresh()} disabled={busy}>
              <RefreshCw size={15} />
              {busy ? 'Checking…' : 'Refresh'}
            </button>
            <button className="button primary" onClick={() => setTracking(true)}>
              <Plus size={15} />
              {tracked ? 'Edit tracking' : 'Track'}
            </button>
          </div>
        </div>
        <div className="profile-meta">
          <SourceBadge source={p.source} />
          <span>{p.account_type ?? 'Account type unavailable'}</span>
          <span>Observed {date(p.retrieved_at, true)} UTC</span>
          <span className={`status ${tracked?.enabled ? '' : 'paused'}`}>
            {tracked?.enabled ? 'Tracking enabled' : 'Not actively tracking'}
          </span>
        </div>
      </section>
      <div className="stats-grid profile-metrics">
        <Stat
          title="Followers"
          value={number(p.followers_count)}
          detail={<SourceBadge source={p.field_sources.followers_count} />}
        />
        <Stat
          title="Following"
          value={number(p.following_count)}
          detail={<SourceBadge source={p.field_sources.following_count} />}
        />
        <Stat
          title="Media count"
          value={number(p.media_count)}
          detail={<SourceBadge source={p.field_sources.media_count} />}
        />
        <Stat
          title="30-day follower growth"
          value={percent(g?.percentage)}
          detail={`${number(g?.absolute)} followers · calculated`}
        />
      </div>
      <nav className="tabs" aria-label="Profile sections">
        {['Overview', 'Media', 'Analytics', 'History', 'Changes', 'Stories'].map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {tab === 'Overview' && (
        <div className="stack">
          <Panel
            title="A year of observations"
            subtitle="Follower counts recorded by RIGtracker. No missing periods are filled in."
          >
            <GrowthChart snapshots={snapshots} color={p.color} />
          </Panel>
          <div className="two-column">
            <Panel title="Profile details">
              <div className="content-pad">
                <dl className="profile-detail-list">
                  {[
                    ['Instagram ID', p.instagram_id, 'instagram_id'],
                    ['Username', p.username, 'username'],
                    ['Account type', p.account_type, 'account_type'],
                    [
                      'Verification',
                      p.verified === null
                        ? 'Unavailable'
                        : p.verified
                          ? 'Verified'
                          : 'Not verified',
                      'verified',
                    ],
                    ['Website', p.website, 'website'],
                    ['Display name', p.display_name, 'display_name'],
                  ].map(([label, value, key]) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>{value ?? 'Unavailable'}</dd>
                      <SourceBadge source={p.field_sources[key ?? ''] ?? p.source} />
                    </div>
                  ))}
                </dl>
              </div>
            </Panel>
            <Panel title="Growth, explained">
              <div className="content-pad stack">
                <div className="profile-detail-list">
                  {[
                    [24 / 24, '24-hour'],
                    [7, '7-day'],
                    [30, '30-day'],
                  ].map(([days, label]) => {
                    const g = growth(snapshots, Number(days));
                    return (
                      <div key={label}>
                        <div className="muted">{label} change</div>
                        <h2 className="positive">
                          {number(g?.absolute)} <small>{percent(g?.percentage)}</small>
                        </h2>
                      </div>
                    );
                  })}
                </div>
                <Hint>
                  Growth = latest observed count − observed count at the period boundary. Percentage
                  growth = change / starting count × 100.
                </Hint>
                <SourceBadge source="derived" />
              </div>
            </Panel>
          </div>
        </div>
      )}
      {tab === 'Media' && <MediaGrid items={media} />}{' '}
      {tab === 'Analytics' && <Analytics profile={p} items={media} />}{' '}
      {(tab === 'History' || tab === 'Changes') && (
        <HistoryView username={p.username} embedded changesOnly={tab === 'Changes'} />
      )}{' '}
      {tab === 'Stories' && (
        <Unsupported>
          Third-party Story retrieval is not supported by the configured official provider.
          Own-account Story analytics is not enabled because current retrieval and retention
          requirements have not been verified.
        </Unsupported>
      )}
      {tracking && <TrackerForm initial={p.username} onClose={() => setTracking(false)} />}
    </>
  );
}
