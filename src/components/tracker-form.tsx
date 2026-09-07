'use client';
import { useState, type FormEvent } from 'react';
import { useWorkspace } from './workspace-context';
import { api } from '@/lib/client';
import { Modal, Hint } from './ui';
export function TrackerForm({ onClose, initial = '' }: { onClose: () => void; initial?: string }) {
  const { data, reload, toast } = useWorkspace();
  const [name, setName] = useState(initial || data.profiles[0]?.username || ''),
    [interval, setInterval] = useState('360'),
    [notify, setNotify] = useState(true),
    [threshold, setThreshold] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/v1/tracked', 'POST', {
        username: name,
        interval_minutes: Number(interval),
        notify,
        ...(threshold ? { threshold: Number(threshold) } : {}),
      });
      await reload();
      toast(`Tracking enabled for @${name}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create tracker');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Track an account" onClose={onClose}>
      <form onSubmit={submit} className="form-stack">
        <p className="muted">Build a history of changes to accounts available in your workspace.</p>
        <label>
          Account
          <select value={name} onChange={(e) => setName(e.target.value)} required>
            {data.profiles.map((p) => (
              <option key={p.id} value={p.username}>
                @{p.username}
              </option>
            ))}
          </select>
        </label>
        <label>
          Refresh interval
          <select value={interval} onChange={(e) => setInterval(e.target.value)}>
            <option value="60">Every hour</option>
            <option value="360">Every 6 hours · recommended</option>
            <option value="720">Every 12 hours</option>
            <option value="1440">Every day</option>
            <option value="10080">Every week</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />{' '}
          Notify me about meaningful changes
        </label>
        <label>
          Follower threshold <span className="muted">(optional)</span>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 150000"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </label>
        <Hint>
          Refreshes respect provider quotas and backoff. Scheduled refreshes require the worker to
          be running.
        </Hint>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy || !name}>
          {busy ? 'Creating tracker…' : 'Start tracking'}
        </button>
      </form>
    </Modal>
  );
}
