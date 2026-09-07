'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Bookmark, Plus, Pencil, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import { Heading, Panel, Avatar, Modal, Empty } from '@/components/ui';
import { api, date } from '@/lib/client';
import { TAGS, type SavedProfile } from '@/domain/models';
function EditSaved({ item, onClose }: { item?: SavedProfile; onClose: () => void }) {
  const { data, reload, toast } = useWorkspace(),
    [name, setName] = useState(item?.profile.username ?? data.profiles[0]?.username ?? ''),
    [notes, setNotes] = useState(item?.notes ?? ''),
    [label, setLabel] = useState(item?.label ?? ''),
    [tags, setTags] = useState(item?.tags ?? ['Research']),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/v1/saved', 'POST', { username: name, notes, label, tags });
      await reload();
      toast('Saved account updated.');
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={item ? 'Edit saved account' : 'Save an account'} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label>
          Account
          <select value={name} onChange={(e) => setName(e.target.value)} disabled={!!item}>
            {data.profiles.map((p) => (
              <option key={p.id} value={p.username}>
                @{p.username}
              </option>
            ))}
          </select>
        </label>
        <label>
          Custom label
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} />
        </label>
        <label>
          Research notes
          <textarea
            placeholder="What would you like to remember?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
          />
        </label>
        <div>
          <p className="muted" style={{ marginBottom: 9 }}>
            Tags
          </p>
          <div className="pill-row">
            {TAGS.map((t) => (
              <button
                type="button"
                key={t}
                className={`filter-pill ${tags.includes(t) ? 'active' : ''}`}
                onClick={() =>
                  setTags((current) =>
                    current.includes(t) ? current.filter((x) => x !== t) : [...current, t],
                  )
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy || !name}>
          {busy ? 'Saving…' : 'Save account'}
        </button>
      </form>
    </Modal>
  );
}
export function Saved() {
  const { data, reload, toast } = useWorkspace(),
    [editing, setEditing] = useState<SavedProfile | 'new' | null>(null),
    [search, setSearch] = useState(''),
    [tag, setTag] = useState('All');
  const items = data.saved.filter(
    (s) =>
      (tag === 'All' || s.tags.includes(tag)) &&
      `${s.profile.username} ${s.label} ${s.notes}`.toLowerCase().includes(search.toLowerCase()),
  );
  async function remove(id: string) {
    try {
      await api(`/api/v1/saved/${id}`, 'DELETE');
      await reload();
      toast('Bookmark removed. Profile history is preserved.');
    } catch (e) {
      toast(String(e));
    }
  }
  return (
    <>
      <Heading
        eyebrow="YOUR RESEARCH COLLECTION"
        title="Saved accounts"
        description="Keep the accounts and context you want to come back to."
        actions={
          <button className="button primary" onClick={() => setEditing('new')}>
            <Plus size={16} />
            Save account
          </button>
        }
      />
      <div className="toolbar">
        <input
          aria-label="Search saved accounts"
          placeholder="Search accounts, notes or labels…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Filter saved tags" value={tag} onChange={(e) => setTag(e.target.value)}>
          {['All', ...TAGS].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="saved-grid">
        {items.map((s) => (
          <Panel key={s.id} className="saved-card">
            <div className="saved-top">
              <Avatar profile={s.profile} />
              <div>
                <Link href={`/profile/${s.profile.username}`}>
                  <strong>{s.label || s.profile.display_name}</strong>
                  <small>@{s.profile.username}</small>
                </Link>
              </div>
              <Bookmark size={16} className="mint" fill="currentColor" />
            </div>
            <div className="pill-row">
              {s.tags.map((t) => (
                <span key={t} className="source">
                  {t}
                </span>
              ))}
            </div>
            <p className="saved-notes">{s.notes || 'No notes yet.'}</p>
            <p className="muted" style={{ fontSize: 11 }}>
              Saved {date(s.created_at)}
              <br />
              Last observation {date(s.profile.retrieved_at)}
            </p>
            <div className="saved-actions">
              <button className="button small" onClick={() => setEditing(s)}>
                <Pencil size={13} />
                Edit notes
              </button>
              <Link className="button small" href={`/profile/${s.profile.username}`}>
                Open profile
              </Link>
              <button
                className="icon-button"
                aria-label={`Remove saved ${s.profile.username}`}
                onClick={() => void remove(s.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </Panel>
        ))}
      </div>
      {!items.length && (
        <Empty title="No saved accounts here">Save a profile or adjust your search filters.</Empty>
      )}
      {editing && (
        <EditSaved
          item={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
