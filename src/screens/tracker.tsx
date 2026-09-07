'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Plus, Pause, Play, Trash2, RefreshCw, Clock, ScanLine } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import { Heading, Panel, Stat, Avatar, Hint, Empty, Modal } from '@/components/ui';
import { TrackerForm } from '@/components/tracker-form';
import { api, date } from '@/lib/client';
export function Tracker() {
  const { data, reload, toast } = useWorkspace(),
    [adding, setAdding] = useState(false),
    [search, setSearch] = useState(''),
    [busy, setBusy] = useState(''),
    [remove, setRemove] = useState('');
  const [now] = useState(Date.now);
  async function act(id: string, method: string, body?: unknown) {
    setBusy(id);
    try {
      await api(`/api/v1/tracked/${id}`, method, body);
      await reload();
      toast(
        method === 'DELETE'
          ? 'Tracker removed. Your existing history is preserved.'
          : 'Tracker updated.',
      );
    } catch (e) {
      toast(String(e));
    } finally {
      setBusy('');
      if (method === 'DELETE') setRemove('');
    }
  }
  async function refresh(name: string) {
    setBusy(name);
    try {
      await api(`/api/v1/profile/${name}/refresh`, 'POST');
      await reload();
      toast('Profile checked. Only new observations were recorded.');
    } catch (e) {
      toast(String(e));
    } finally {
      setBusy('');
    }
  }
  const running = data.worker_last_seen && now - Date.parse(data.worker_last_seen) < 180000;
  return (
    <>
      <Heading
        eyebrow="ALWAYS IN CONTEXT"
        title="Tracker"
        description="Turn permitted refreshes into a lasting record."
        actions={
          <button className="button primary" onClick={() => setAdding(true)}>
            <Plus size={16} />
            Track account
          </button>
        }
      />
      <div className="stats-grid">
        <Stat
          title="Configured trackers"
          value={data.tracked.length}
          icon={<ScanLine size={18} />}
        />
        <Stat title="Enabled" value={data.tracked.filter((t) => t.enabled).length} />
        <Stat title="Need attention" value={data.tracked.filter((t) => t.failures > 0).length} />
        <Stat
          title="Scheduler"
          value={<span style={{ fontSize: 21 }}>{running ? 'Running' : 'Not running'}</span>}
          detail={running ? 'Worker heartbeat received' : 'Manual refresh remains available'}
          positive={!!running}
        />
      </div>
      <div className="toolbar">
        <input
          placeholder="Filter tracked accounts…"
          aria-label="Filter tracked accounts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Hint>Intervals are minimums. Provider quotas can delay refreshes.</Hint>
      </div>
      <Panel title="Your tracking schedule">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Refresh interval</th>
                <th>Status</th>
                <th>Notifications</th>
                <th>Next scheduled check</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.tracked
                .filter((t) => t.profile.username.includes(search.toLowerCase()))
                .map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/profile/${t.profile.username}`} className="person-cell">
                        <Avatar profile={t.profile} />
                        <span>
                          <strong>{t.profile.display_name}</strong>
                          <small>@{t.profile.username}</small>
                        </span>
                      </Link>
                      {t.last_error && <small className="negative">{t.last_error}</small>}
                    </td>
                    <td>
                      <select
                        aria-label={`Refresh interval for ${t.profile.username}`}
                        value={t.interval_minutes}
                        disabled={!!busy}
                        onChange={(e) =>
                          void act(t.id, 'PATCH', { interval_minutes: Number(e.target.value) })
                        }
                      >
                        <option value="60">Every hour</option>
                        <option value="360">Every 6 hours</option>
                        <option value="720">Every 12 hours</option>
                        <option value="1440">Daily</option>
                        <option value="10080">Weekly</option>
                      </select>
                    </td>
                    <td>
                      <span className={`status ${t.enabled ? '' : 'paused'}`}>
                        {t.enabled ? 'Enabled' : 'Paused'}
                      </span>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={t.notify}
                        aria-label={`Notifications for ${t.profile.username}`}
                        disabled={!!busy}
                        onChange={(e) => void act(t.id, 'PATCH', { notify: e.target.checked })}
                      />
                    </td>
                    <td className="muted">
                      <Clock size={13} className="inline-icon" />
                      {t.enabled ? date(t.next_run_at, true) : 'Paused'}
                    </td>
                    <td>
                      <div className="heading-actions">
                        <button
                          className="icon-button"
                          aria-label={`Refresh ${t.profile.username}`}
                          disabled={!!busy}
                          onClick={() => void refresh(t.profile.username)}
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`${t.enabled ? 'Pause' : 'Resume'} ${t.profile.username}`}
                          disabled={!!busy}
                          onClick={() => void act(t.id, 'PATCH', { enabled: !t.enabled })}
                        >
                          {t.enabled ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Remove tracker ${t.profile.username}`}
                          onClick={() => setRemove(t.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!data.tracked.length && (
          <Empty title="Start building a history">Add an available account to your tracker.</Empty>
        )}
      </Panel>
      <Hint>
        Scheduled jobs use a durable database lease, bounded retries, exponential backoff, and
        provider request budgets. A paused tracker retains its observations.
      </Hint>
      {adding && <TrackerForm onClose={() => setAdding(false)} />}{' '}
      {remove && (
        <Modal title="Remove this tracker?" onClose={() => setRemove('')}>
          <p className="muted">
            Scheduled tracking will stop. Existing profile history will remain in your workspace.
          </p>
          <div className="heading-actions" style={{ marginTop: 20 }}>
            <button className="button" onClick={() => setRemove('')}>
              Cancel
            </button>
            <button
              className="button danger"
              disabled={!!busy}
              onClick={() => void act(remove, 'DELETE')}
            >
              Remove tracker
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
