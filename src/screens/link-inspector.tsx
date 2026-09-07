'use client';
import { useState, type FormEvent } from 'react';
import { Link2, Copy, ArrowRight, Check } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import { Heading, Panel, Hint } from '@/components/ui';
import { api, date } from '@/lib/client';
import type { inspectLink } from '@/services/links';
type Result = ReturnType<typeof inspectLink>;
export function LinkInspector() {
  const { toast } = useWorkspace(),
    [url, setUrl] = useState(''),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [copied, setCopied] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    setCopied(false);
    try {
      setResult(await api<Result>('/api/v1/link/inspect', 'POST', { url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to inspect link');
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(result!.canonical_url);
      setCopied(true);
      toast('Clean URL copied.');
    } catch {
      toast('Copy unavailable in this browser. Select and copy the canonical URL below.');
    }
  }
  return (
    <>
      <Heading
        eyebrow="LESS NOISE, MORE SIGNAL"
        title="Link inspector"
        description="Understand an Instagram link and remove recognized tracking parameters."
      />
      <div className="lookup-box">
        <h2>Where does this link point?</h2>
        <form onSubmit={submit} className="lookup-form">
          <input
            aria-label="Instagram URL"
            placeholder="https://www.instagram.com/reel/…?igsh=…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            maxLength={2048}
          />
          <button className="button primary" disabled={busy}>
            <Link2 size={16} />
            {busy ? 'Inspecting…' : 'Inspect link'}
          </button>
        </form>
        <div className="pill-row" style={{ marginTop: 15 }}>
          <button
            className="filter-pill"
            onClick={() =>
              setUrl('https://www.instagram.com/reel/RIGdemo123/?igsh=fictional&utm_source=demo')
            }
          >
            Try a sample reel <ArrowRight size={12} className="inline-icon" />
          </button>
          <button
            className="filter-pill"
            onClick={() =>
              setUrl('https://www.instagram.com/stories/rigtracker_demo/123456789/?utm_medium=demo')
            }
          >
            Try a story link
          </button>
        </div>
        {error && (
          <p role="alert" className="form-error" style={{ marginTop: 15 }}>
            {error}
          </p>
        )}
      </div>
      {result && (
        <Panel
          title="Link intelligence"
          action={
            <button className="button small" onClick={() => void copy()}>
              {copied ? <Check size={14} /> : <Copy size={14} />}Copy Clean URL
            </button>
          }
        >
          <div className="content-pad">
            <dl className="result-list">
              {[
                ['Original URL', result.original_url],
                ['Canonical URL', result.canonical_url],
                ['Resource type', result.type],
                ['Public identifier', result.identifier ?? 'Not present'],
                ['Removed parameters', result.tracking_parameters.join(', ') || 'None recognized'],
                ['Redirect chain', 'Not followed · no HTTP requests'],
                ['Checked at', `${date(result.checked_at, true)} UTC`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'contents' }}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Panel>
      )}
      <div style={{ marginTop: 22 }}>
        <Hint>
          Inspection reads visible URL structure only. It does not fetch destinations, verify that a
          resource exists, expand short links, or identify the person who shared a link. This also
          prevents server-side request forgery.
        </Hint>
      </div>
    </>
  );
}
