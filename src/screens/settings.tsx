'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Link2, Download, Unplug, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import { Heading, Panel, Modal, Hint, SourceBadge } from '@/components/ui';
import { api, date, download } from '@/lib/client';
export function Settings() {
  const { data, reload, toast } = useWorkspace(),
    router = useRouter(),
    params = useSearchParams(),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(false),
    [confirm, setConfirm] = useState('');
  async function connect() {
    setBusy(true);
    try {
      const result = await api<{ url: string }>('/api/auth/instagram/start', 'POST');
      window.location.assign(result.url);
    } catch (e) {
      toast(String(e));
      setBusy(false);
    }
  }
  async function disconnect(id: string) {
    setBusy(true);
    try {
      await api(`/api/v1/me/connections/${id}`, 'DELETE');
      await reload();
      toast(
        'Local connection removed. You can also revoke RIGtracker in Instagram’s app settings.',
      );
    } catch (e) {
      toast(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api('/api/v1/me/data', 'DELETE');
      router.push('/');
    } catch (e) {
      toast(String(e));
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="MAKE THE WORKSPACE YOURS"
        title="Settings"
        description="Connections, data, and the boundaries that keep your research clear."
      />
      {params.get('connection') && (
        <div className="notice" style={{ marginBottom: 22 }}>
          <ShieldCheck size={19} />
          <p>
            {params.get('connection') === 'connected'
              ? 'Instagram connected successfully.'
              : 'Instagram authorization was cancelled. No connection was added.'}
          </p>
        </div>
      )}
      <div className="stack">
        <Panel
          title="Instagram connections"
          subtitle="Authenticate directly with Meta. RIGtracker never receives your Instagram password."
        >
          <div className="content-pad">
            <div className="settings-row">
              <div>
                <h3>Connect a professional account</h3>
                <p>
                  {data.provider === 'mock'
                    ? 'This workspace uses fictional data. Configure the Meta provider to enable real connections.'
                    : data.meta_configured
                      ? 'Your provider is configured for Instagram Login. App approval and account permissions still apply.'
                      : 'Meta app settings are required before connecting.'}
                </p>
              </div>
              <button
                className="button primary"
                disabled={busy || data.provider === 'mock' || !data.meta_configured}
                onClick={() => void connect()}
              >
                <Link2 size={16} />
                Connect Instagram
              </button>
            </div>
            {data.connections.map((c) => (
              <div className="settings-row" key={c.id}>
                <div>
                  <h3>@{c.username}</h3>
                  <p>
                    Provider ID: {c.provider_account_id}
                    <br />
                    Expires: {date(c.expires_at, true)} UTC
                  </p>
                  <div className="pill-row" style={{ marginTop: 10 }}>
                    {c.scopes.map((scope) => (
                      <span key={scope} className="source">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
                <button className="button" disabled={busy} onClick={() => void disconnect(c.id)}>
                  <Unplug size={15} />
                  Disconnect
                </button>
              </div>
            ))}
            <Hint>
              Live access is restricted to your authorized professional account. Unavailable fields
              remain empty. The setup and capability matrix are included in the project
              documentation.
            </Hint>
          </div>
        </Panel>
        <div className="two-column">
          <Panel title="Workspace environment">
            <div className="content-pad">
              <dl className="result-list">
                <dt>Name</dt>
                <dd>{data.user.name}</dd>
                <dt>Email</dt>
                <dd>{data.user.email ?? 'Temporary demo workspace'}</dd>
                <dt>Data provider</dt>
                <dd>
                  <SourceBadge source={data.provider === 'mock' ? 'mock' : 'authorized'} />
                </dd>
                <dt>Storage</dt>
                <dd>{data.storage}</dd>
                <dt>Last worker heartbeat</dt>
                <dd>
                  {data.worker_last_seen
                    ? `${date(data.worker_last_seen, true)} UTC`
                    : 'No worker has checked in'}
                </dd>
              </dl>
            </div>
          </Panel>
          <Panel title="Data source principles">
            <div className="content-pad stack">
              <p className="muted">
                Every field belongs to a source. A calculation never becomes an Instagram-confirmed
                fact.
              </p>
              <div className="pill-row">
                {(
                  [
                    'official',
                    'authorized',
                    'historical_observation',
                    'derived',
                    'unavailable',
                    'mock',
                  ] as const
                ).map((source) => (
                  <SourceBadge key={source} source={source} />
                ))}
              </div>
              <Hint>
                No private profiles, hidden contact details, login recovery data, or access-control
                bypasses.
              </Hint>
            </div>
          </Panel>
        </div>
        <Panel title="Your data, your control">
          <div className="content-pad">
            <div className="settings-row">
              <div>
                <h3>Export workspace data</h3>
                <p>
                  Download profiles, snapshots, media observations, notes and events as JSON.
                  Authentication secrets are excluded.
                </p>
              </div>
              <button
                className="button"
                onClick={() =>
                  download(
                    'rigtracker-workspace.json',
                    JSON.stringify(
                      {
                        ...data,
                        connections: data.connections.map(({ id, ...connection }) => ({
                          connection_id: id,
                          ...connection,
                        })),
                      },
                      null,
                      2,
                    ),
                  )
                }
              >
                <Download size={15} />
                Export data
              </button>
            </div>
            <div className="settings-row">
              <div>
                <h3>Delete workspace and account</h3>
                <p>
                  Permanently delete your local profiles, observations, notes, sessions and
                  encrypted connections.
                </p>
              </div>
              <button className="button danger" onClick={() => setDeleting(true)}>
                <Trash2 size={15} />
                Delete my data
              </button>
            </div>
          </div>
        </Panel>
      </div>
      {deleting && (
        <Modal title="Permanently delete this workspace?" onClose={() => setDeleting(false)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (confirm === 'DELETE') void remove();
            }}
          >
            <p>
              All locally stored data for this account will be removed. This cannot be undone.
              Instagram content is not deleted.
            </p>
            <label>
              Type DELETE to confirm
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button className="button danger" disabled={confirm !== 'DELETE' || busy}>
              {busy ? 'Deleting…' : 'Permanently delete my data'}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
